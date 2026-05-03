import type { ChapterScript } from '../types/script';
import { getAudioCacheEntry, saveChapterAudio, getChapterAudio } from './db';
import { pcmToWav } from './wavAssembler';

export interface ChapterAudio {
  wav: Blob;
  durationMs: number;
  blockTimings: { id: string; startMs: number; durationMs: number }[];
}

export async function assembleChapterAudio(script: ChapterScript): Promise<ChapterAudio> {
  const pcmChunks: ArrayBuffer[] = [];
  const blockTimings: { id: string; startMs: number; durationMs: number }[] = [];
  let cursorMs = 0;

  for (const block of script.blocks) {
    if (block.audioStatus !== 'done' || !block.audioCacheKey) continue;
    const entry = await getAudioCacheEntry(block.audioCacheKey);
    if (!entry) continue;
    pcmChunks.push(entry.pcmBytes);
    const durationMs = entry.durationMs || block.durationMs || 0;
    blockTimings.push({ id: block.id, startMs: cursorMs, durationMs });
    cursorMs += durationMs;
  }

  const { wav, durationMs } = pcmToWav(pcmChunks);

  await saveChapterAudio({
    bookId: script.bookId,
    chapterOrder: script.chapterOrder,
    wavBytes: await wav.arrayBuffer(),
    sizeBytes: wav.size,
    durationMs,
    createdAt: new Date().toISOString(),
  });

  return { wav, durationMs, blockTimings };
}

export async function getStoredChapterAudio(
  bookId: string,
  chapterOrder: number,
): Promise<{ wav: Blob; durationMs: number } | null> {
  const stored = await getChapterAudio(bookId, chapterOrder);
  if (!stored) return null;
  return {
    wav: new Blob([stored.wavBytes], { type: 'audio/wav' }),
    durationMs: stored.durationMs,
  };
}
