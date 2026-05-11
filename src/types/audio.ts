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
  styleHint?: string;
}

export interface SeriesInfo {
  name: string;
  index?: number;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ExtractedCharacters {
  characters: ExtractedCharacter[];
  series?: SeriesInfo;
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
  suggestedGender?: VoiceGender | 'neutral';
}

export interface BookCasting {
  bookId: string;
  narrator: VoiceSlot;
  characters: CharacterCasting[];
  series?: SeriesInfo;
  updatedAt: string;
}

export interface ParsedBookRecord extends ParsedFB2 {
  bookId: string;
  series?: SeriesInfo;
}

export interface SeriesPriorCharacter {
  name: string;
  description: string;
  voiceId: string;
  styleHint: string;
  fromBookTitle: string;
}

export const NARRATOR_KEY = 'Рассказчик';
