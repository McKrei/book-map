import type { ParsedFB2 } from './index';

export type VoiceGender = 'male' | 'female';

export type VoicePitch = 'lower' | 'lower-middle' | 'middle' | 'higher';

export interface Voice {
  id: string;
  gender: VoiceGender;
  style: string;
  pitch: VoicePitch;
  description: string;
  recommendedFor?: string[];
}

export type SuggestedTone =
  | 'youthful'
  | 'mature'
  | 'elderly'
  | 'child'
  | 'intimidating'
  | 'warm'
  | 'authoritative'
  | 'neutral';

export interface ExtractedCharacter {
  name: string;
  description: string;
  isMain: boolean;
  suggestedGender: VoiceGender | 'neutral';
  suggestedTone: SuggestedTone;
}

export interface ExtractedCharacters {
  characters: ExtractedCharacter[];
}

export interface VoiceSlot {
  voiceId: string;
  styleHint: string;
}

export interface CharacterCasting {
  name: string;
  description: string;
  isMain: boolean;
  voice: VoiceSlot;
  color: string;
}

export interface BookCasting {
  bookId: string;
  narrator: VoiceSlot;
  characters: CharacterCasting[];
  updatedAt: string;
}

export interface ParsedBookRecord extends ParsedFB2 {
  bookId: string;
}

export const NARRATOR_KEY = 'Рассказчик';
