import { create } from 'zustand';
import type { BookCasting, CharacterCasting, VoiceSlot } from '../types/audio';

interface AudioState {
  bookId: string | null;
  casting: BookCasting | null;
  isExtracting: boolean;
  extractMessage: string;
  extractError: string | null;

  setBookId: (id: string | null) => void;
  setCasting: (casting: BookCasting | null) => void;
  updateCharacter: (name: string, patch: Partial<CharacterCasting>) => void;
  updateNarrator: (patch: Partial<VoiceSlot>) => void;
  setExtracting: (busy: boolean, message?: string) => void;
  setExtractError: (err: string | null) => void;
  reset: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  bookId: null,
  casting: null,
  isExtracting: false,
  extractMessage: '',
  extractError: null,

  setBookId: (id) => set({ bookId: id }),
  setCasting: (casting) => set({ casting, extractError: null }),
  updateCharacter: (name, patch) =>
    set((state) => {
      if (!state.casting) return state;
      const characters = state.casting.characters.map((c) =>
        c.name === name
          ? {
              ...c,
              ...patch,
              voice: patch.voice ? { ...c.voice, ...patch.voice } : c.voice,
            }
          : c,
      );
      return {
        casting: {
          ...state.casting,
          characters,
          updatedAt: new Date().toISOString(),
        },
      };
    }),
  updateNarrator: (patch) =>
    set((state) => {
      if (!state.casting) return state;
      return {
        casting: {
          ...state.casting,
          narrator: { ...state.casting.narrator, ...patch },
          updatedAt: new Date().toISOString(),
        },
      };
    }),
  setExtracting: (busy, message = '') =>
    set({ isExtracting: busy, extractMessage: message, extractError: busy ? null : undefined }),
  setExtractError: (err) => set({ extractError: err, isExtracting: false }),
  reset: () =>
    set({
      bookId: null,
      casting: null,
      isExtracting: false,
      extractMessage: '',
      extractError: null,
    }),
}));
