import { create } from 'zustand';
import type { ChapterScript, ScriptBlock } from '../types/script';

interface ScriptState {
  bookId: string | null;
  chapterOrder: number | null;
  script: ChapterScript | null;

  isMarkingUp: boolean;
  markupMessage: string;
  markupError: string | null;

  setKey: (bookId: string | null, chapterOrder: number | null) => void;
  setScript: (script: ChapterScript | null) => void;
  updateBlock: (id: string, patch: Partial<ScriptBlock>) => void;
  removeBlock: (id: string) => void;
  splitBlock: (id: string, atIndex: number) => void;
  setMarkup: (busy: boolean, message?: string) => void;
  setMarkupError: (err: string | null) => void;
  reset: () => void;
}

function touch(script: ChapterScript): ChapterScript {
  return { ...script, updatedAt: new Date().toISOString() };
}

export const useScriptStore = create<ScriptState>((set) => ({
  bookId: null,
  chapterOrder: null,
  script: null,
  isMarkingUp: false,
  markupMessage: '',
  markupError: null,

  setKey: (bookId, chapterOrder) => set({ bookId, chapterOrder }),
  setScript: (script) => set({ script, markupError: null }),
  updateBlock: (id, patch) =>
    set((state) => {
      if (!state.script) return state;
      const blocks = state.script.blocks.map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      );
      return { script: touch({ ...state.script, blocks }) };
    }),
  removeBlock: (id) =>
    set((state) => {
      if (!state.script) return state;
      const blocks = state.script.blocks.filter((b) => b.id !== id);
      return { script: touch({ ...state.script, blocks }) };
    }),
  splitBlock: (id, atIndex) =>
    set((state) => {
      if (!state.script) return state;
      const block = state.script.blocks.find((b) => b.id === id);
      if (!block || atIndex <= 0 || atIndex >= block.text.length) return state;
      const left = block.text.slice(0, atIndex).trim();
      const right = block.text.slice(atIndex).trim();
      if (!left || !right) return state;
      const newBlocks: ScriptBlock[] = [];
      for (const b of state.script.blocks) {
        if (b.id === id) {
          newBlocks.push({ ...b, text: left, audioStatus: 'pending', audioCacheKey: undefined });
          newBlocks.push({
            ...b,
            id: `${b.id}_split_${Date.now()}`,
            text: right,
            audioStatus: 'pending',
            audioCacheKey: undefined,
          });
        } else {
          newBlocks.push(b);
        }
      }
      return { script: touch({ ...state.script, blocks: newBlocks }) };
    }),
  setMarkup: (busy, message = '') =>
    set({ isMarkingUp: busy, markupMessage: message, markupError: busy ? null : undefined }),
  setMarkupError: (err) => set({ markupError: err, isMarkingUp: false }),
  reset: () =>
    set({
      bookId: null,
      chapterOrder: null,
      script: null,
      isMarkingUp: false,
      markupMessage: '',
      markupError: null,
    }),
}));
