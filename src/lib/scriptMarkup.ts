import type { BookCasting } from '../types/audio';
import type { ChapterScript, ScriptBlock } from '../types/script';
import { NARRATOR_SPEAKER } from '../types/script';
import { callGeminiJson, getFlashModel } from './geminiClient';
import { markupChapterPrompt } from './audioPrompts';

interface RawBlock {
  speaker?: unknown;
  text?: unknown;
  emotion?: unknown;
  audioTag?: unknown;
}

interface RawResponse {
  blocks?: RawBlock[];
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface MarkupChapterOptions {
  bookId: string;
  chapterOrder: number;
  chapterTitle: string;
  text: string;
  casting: BookCasting;
  model?: string;
  signal?: AbortSignal;
  onProgress?: (msg: string) => void;
}

export async function markupChapter(opts: MarkupChapterOptions): Promise<ChapterScript> {
  const { bookId, chapterOrder, chapterTitle, text, casting, model, signal, onProgress } = opts;
  const targetModel = model || getFlashModel();

  onProgress?.(`Отправляю главу ${chapterOrder} на разметку через ${targetModel}...`);

  const prompt = markupChapterPrompt({ chapterOrder, chapterTitle, text, casting });
  const raw = await callGeminiJson<RawResponse>(targetModel, prompt, { signal });

  if (!raw || !Array.isArray(raw.blocks)) {
    throw new Error('Gemini вернул невалидную структуру разметки главы');
  }

  const validSpeakers = new Set<string>([
    NARRATOR_SPEAKER,
    ...casting.characters.map((c) => c.name),
  ]);

  const blocks: ScriptBlock[] = raw.blocks
    .map<ScriptBlock | null>((b) => {
      const text = typeof b.text === 'string' ? b.text.trim() : '';
      if (!text) return null;
      const speakerRaw = typeof b.speaker === 'string' ? b.speaker.trim() : NARRATOR_SPEAKER;
      const speaker = validSpeakers.has(speakerRaw) ? speakerRaw : NARRATOR_SPEAKER;
      const emotion =
        typeof b.emotion === 'string' && b.emotion.trim() ? b.emotion.trim() : undefined;
      const audioTag =
        typeof b.audioTag === 'string' && b.audioTag.trim() ? b.audioTag.trim() : undefined;
      return {
        id: genId(),
        speaker,
        text,
        emotion,
        audioTag,
        audioStatus: 'pending',
      };
    })
    .filter((b): b is ScriptBlock => b !== null)
    .slice(0, 250);

  onProgress?.(`Получено блоков: ${blocks.length}`);

  const now = new Date().toISOString();
  return {
    bookId,
    chapterOrder,
    chapterTitle,
    blocks,
    generatedAt: now,
    updatedAt: now,
  };
}
