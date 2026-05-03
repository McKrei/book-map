import type { ParsedFB2 } from '../types';
import type {
  BookCasting,
  CharacterCasting,
  ExtractedCharacter,
  ExtractedCharacters,
} from '../types/audio';
import { callGeminiJson, getProModel } from './geminiClient';
import { extractCharactersPrompt } from './audioPrompts';
import {
  NARRATOR_DEFAULT_MALE,
  NARRATOR_DEFAULT_FEMALE,
  colorForIndex,
  suggestVoice,
} from './voicePresets';

export interface ExtractCharactersOptions {
  onProgress?: (msg: string) => void;
  signal?: AbortSignal;
  model?: string;
}

function isExtractedCharacters(value: unknown): value is ExtractedCharacters {
  if (!value || typeof value !== 'object') return false;
  const v = value as { characters?: unknown };
  if (!Array.isArray(v.characters)) return false;
  return v.characters.every(
    (c): c is ExtractedCharacter =>
      typeof c === 'object' &&
      c !== null &&
      typeof (c as ExtractedCharacter).name === 'string' &&
      typeof (c as ExtractedCharacter).description === 'string',
  );
}

export async function extractCharacters(
  book: ParsedFB2,
  options: ExtractCharactersOptions = {},
): Promise<ExtractedCharacters> {
  const { onProgress, signal, model } = options;
  const targetModel = model || getProModel();

  onProgress?.(`Отправляю книгу на анализ через ${targetModel}...`);

  const prompt = extractCharactersPrompt(book);
  const raw = await callGeminiJson<unknown>(targetModel, prompt, { signal });

  if (!isExtractedCharacters(raw)) {
    throw new Error('Gemini вернул невалидную структуру для списка персонажей');
  }

  onProgress?.(`Получено персонажей: ${raw.characters.length}`);

  const sanitized = raw.characters
    .filter((c) => Boolean(c.name?.trim()))
    .slice(0, 12)
    .map<ExtractedCharacter>((c) => ({
      name: c.name.trim(),
      description: (c.description || '').trim(),
      isMain: Boolean(c.isMain),
      suggestedGender:
        c.suggestedGender === 'female' || c.suggestedGender === 'male'
          ? c.suggestedGender
          : 'neutral',
      suggestedTone:
        ([
          'youthful',
          'mature',
          'elderly',
          'child',
          'intimidating',
          'warm',
          'authoritative',
          'neutral',
        ] as const).includes(c.suggestedTone)
          ? c.suggestedTone
          : 'neutral',
    }));

  return { characters: sanitized };
}

export function buildDefaultCasting(
  bookId: string,
  extracted: ExtractedCharacters,
): BookCasting {
  const usedVoices: string[] = [];

  const sortedExtracted = [...extracted.characters].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return 0;
  });

  const characters: CharacterCasting[] = sortedExtracted.map((char, idx) => {
    const voiceId = suggestVoice({
      gender: char.suggestedGender,
      tone: char.suggestedTone,
      excludeIds: usedVoices,
    });
    usedVoices.push(voiceId);

    return {
      name: char.name,
      description: char.description,
      isMain: char.isMain,
      voice: { voiceId, styleHint: '' },
      color: colorForIndex(idx + 1),
    };
  });

  const narratorVoiceId = NARRATOR_DEFAULT_MALE && !usedVoices.includes(NARRATOR_DEFAULT_MALE)
    ? NARRATOR_DEFAULT_MALE
    : NARRATOR_DEFAULT_FEMALE && !usedVoices.includes(NARRATOR_DEFAULT_FEMALE)
      ? NARRATOR_DEFAULT_FEMALE
      : suggestVoice({ tone: 'neutral', excludeIds: usedVoices });

  return {
    bookId,
    narrator: {
      voiceId: narratorVoiceId,
      styleHint: 'Спокойный, выразительный голос рассказчика аудиокниги.',
    },
    characters,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeCasting(
  bookId: string,
  existing: BookCasting | null,
  extracted: ExtractedCharacters,
): BookCasting {
  if (!existing) return buildDefaultCasting(bookId, extracted);

  const byName = new Map(existing.characters.map((c) => [c.name, c]));
  const usedVoices = existing.characters.map((c) => c.voice.voiceId);

  const merged: CharacterCasting[] = extracted.characters.map((char, idx) => {
    const prev = byName.get(char.name);
    if (prev) {
      byName.delete(char.name);
      return {
        ...prev,
        description: char.description || prev.description,
        isMain: char.isMain || prev.isMain,
      };
    }
    const voiceId = suggestVoice({
      gender: char.suggestedGender,
      tone: char.suggestedTone,
      excludeIds: usedVoices,
    });
    usedVoices.push(voiceId);
    return {
      name: char.name,
      description: char.description,
      isMain: char.isMain,
      voice: { voiceId, styleHint: '' },
      color: colorForIndex(existing.characters.length + idx + 1),
    };
  });

  const orphans = Array.from(byName.values());

  return {
    bookId,
    narrator: existing.narrator,
    characters: [...merged, ...orphans],
    updatedAt: new Date().toISOString(),
  };
}
