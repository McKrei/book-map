export type AudioBlockStatus = 'pending' | 'generating' | 'done' | 'error';

export const NARRATOR_SPEAKER = '__narrator__';

export interface ScriptBlock {
  id: string;
  speaker: string;
  text: string;
  emotion?: string;
  audioTag?: string;
  audioStatus: AudioBlockStatus;
  audioCacheKey?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface ChapterScript {
  bookId: string;
  chapterOrder: number;
  chapterTitle: string;
  blocks: ScriptBlock[];
  generatedAt: string;
  updatedAt: string;
  audioCompletedAt?: string;
}

export interface ChapterAudioRecord {
  bookId: string;
  chapterOrder: number;
  wavBytes: ArrayBuffer;
  sizeBytes: number;
  durationMs: number;
  createdAt: string;
}
