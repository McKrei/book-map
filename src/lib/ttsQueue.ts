import type { BookCasting } from '../types/audio';
import type { ChapterScript, ScriptBlock } from '../types/script';
import { NARRATOR_SPEAKER } from '../types/script';
import { callGeminiTTS } from './geminiTTS';
import { cacheKeyForBlock, getCachedPcm, putCachedPcm } from './audioCache';
import { saveChapterScript, getAudioCacheEntry } from './db';

export interface QueueProgress {
  total: number;
  done: number;
  generating: number;
  errors: number;
  fromCache: number;
  currentBlockId?: string;
}

export interface RunQueueOptions {
  script: ChapterScript;
  casting: BookCasting;
  parallelism?: number;
  signal?: AbortSignal;
  onProgress?: (progress: QueueProgress, script: ChapterScript) => void;
  onScriptUpdate?: (script: ChapterScript) => void;
  blockIds?: string[];
  force?: boolean;
}

interface QueueState {
  script: ChapterScript;
  progress: QueueProgress;
}

function findVoice(
  casting: BookCasting,
  speaker: string,
): { voiceId: string; styleHint: string } | null {
  if (speaker === NARRATOR_SPEAKER) {
    return { voiceId: casting.narrator.voiceId, styleHint: casting.narrator.styleHint };
  }
  const c = casting.characters.find((x) => x.name === speaker);
  if (!c) return null;
  return { voiceId: c.voice.voiceId, styleHint: c.voice.styleHint };
}

function clone(script: ChapterScript): ChapterScript {
  return {
    ...script,
    blocks: script.blocks.map((b) => ({ ...b })),
    updatedAt: new Date().toISOString(),
  };
}

function progressFromBlocks(blocks: ScriptBlock[], fromCache: number): QueueProgress {
  const done = blocks.filter((b) => b.audioStatus === 'done').length;
  const generating = blocks.filter((b) => b.audioStatus === 'generating').length;
  const errors = blocks.filter((b) => b.audioStatus === 'error').length;
  return { total: blocks.length, done, generating, errors, fromCache };
}

async function processOneBlock(
  state: QueueState,
  blockIdx: number,
  casting: BookCasting,
  signal: AbortSignal | undefined,
  onChange: () => void,
  force: boolean,
): Promise<void> {
  const block = state.script.blocks[blockIdx];
  if (!force && block.audioStatus === 'done' && block.audioCacheKey) {
    const existing = await getAudioCacheEntry(block.audioCacheKey);
    if (existing) return;
  }

  const voice = findVoice(casting, block.speaker) ||
    findVoice(casting, NARRATOR_SPEAKER) || { voiceId: '', styleHint: '' };

  if (!voice.voiceId) {
    state.script.blocks[blockIdx] = {
      ...block,
      audioStatus: 'error',
      errorMessage: `Нет назначенного голоса для "${block.speaker}"`,
    };
    onChange();
    return;
  }

  const cacheKey = await cacheKeyForBlock(block, voice);

  const cached = await getCachedPcm(cacheKey);
  if (cached) {
    state.script.blocks[blockIdx] = {
      ...block,
      audioStatus: 'done',
      audioCacheKey: cacheKey,
      durationMs: cached.durationMs,
      errorMessage: undefined,
    };
    state.progress.fromCache += 1;
    onChange();
    return;
  }

  state.script.blocks[blockIdx] = {
    ...block,
    audioStatus: 'generating',
    audioCacheKey: cacheKey,
    errorMessage: undefined,
  };
  onChange();

  try {
    const pcm = await callGeminiTTS({
      text: block.text,
      voiceId: voice.voiceId,
      styleHint: voice.styleHint,
      audioTag: block.audioTag,
      signal,
    });
    const durationMs = await putCachedPcm(cacheKey, voice.voiceId, block.text, pcm);
    state.script.blocks[blockIdx] = {
      ...state.script.blocks[blockIdx],
      audioStatus: 'done',
      audioCacheKey: cacheKey,
      durationMs,
      errorMessage: undefined,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      state.script.blocks[blockIdx] = {
        ...state.script.blocks[blockIdx],
        audioStatus: 'pending',
        errorMessage: undefined,
      };
      onChange();
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    state.script.blocks[blockIdx] = {
      ...state.script.blocks[blockIdx],
      audioStatus: 'error',
      errorMessage: msg.slice(0, 200),
    };
  }
  onChange();
}

export async function runTtsQueue(opts: RunQueueOptions): Promise<ChapterScript> {
  const {
    casting,
    parallelism = 3,
    signal,
    onProgress,
    onScriptUpdate,
    blockIds,
    force = false,
  } = opts;
  const state: QueueState = {
    script: clone(opts.script),
    progress: progressFromBlocks(opts.script.blocks, 0),
  };

  const filterSet = blockIds && blockIds.length > 0 ? new Set(blockIds) : null;
  const indices: number[] = [];
  for (let i = 0; i < state.script.blocks.length; i++) {
    const b = state.script.blocks[i];
    if (filterSet) {
      if (filterSet.has(b.id)) indices.push(i);
      continue;
    }
    if (force || b.audioStatus !== 'done') indices.push(i);
  }

  let next = 0;
  let lastSave = 0;
  const SAVE_THROTTLE_MS = 600;
  let aborted = false;

  const onChange = () => {
    state.progress = {
      ...progressFromBlocks(state.script.blocks, state.progress.fromCache),
      currentBlockId: state.progress.currentBlockId,
    };
    onProgress?.({ ...state.progress }, state.script);
    onScriptUpdate?.(state.script);
    const now = Date.now();
    if (now - lastSave > SAVE_THROTTLE_MS) {
      lastSave = now;
      saveChapterScript({ ...state.script }).catch(() => undefined);
    }
  };

  const worker = async () => {
    while (true) {
      if (aborted || signal?.aborted) return;
      const i = next++;
      if (i >= indices.length) return;
      const blockIdx = indices[i];
      state.progress.currentBlockId = state.script.blocks[blockIdx].id;
      try {
        await processOneBlock(state, blockIdx, casting, signal, onChange, force);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          aborted = true;
          return;
        }
      }
    }
  };

  const workers: Promise<void>[] = [];
  const limit = Math.max(1, Math.min(parallelism, 6));
  for (let i = 0; i < limit; i++) workers.push(worker());

  try {
    await Promise.all(workers);
  } finally {
    state.progress.currentBlockId = undefined;
    state.script.updatedAt = new Date().toISOString();
    if (state.progress.errors === 0 && state.progress.done === state.script.blocks.length) {
      state.script.audioCompletedAt = new Date().toISOString();
    }
    await saveChapterScript({ ...state.script }).catch(() => undefined);
    onProgress?.({ ...state.progress }, state.script);
  }

  return state.script;
}
