import type { ParsedFB2 } from '../types';
import type {
  BookCasting,
  CharacterCasting,
  ExtractedCharacter,
  ExtractedCharacters,
  SeriesInfo,
} from '../types/audio';
import { callGeminiJson, getProModel } from './geminiClient';
import { extractCharactersPrompt } from './audioPrompts';
import {
  NARRATOR_DEFAULT_MALE,
  NARRATOR_DEFAULT_FEMALE,
  colorForIndex,
  suggestVoice,
} from './voicePresets';
import { findSeriesContext } from './seriesPriors';
import { updateParsedBookSeries } from './db';

export interface ExtractCharactersOptions {
  onProgress?: (msg: string) => void;
  signal?: AbortSignal;
  model?: string;
  bookId?: string;
}

const TONES = [
  'youthful',
  'mature',
  'elderly',
  'child',
  'intimidating',
  'warm',
  'authoritative',
  'neutral',
] as const;

function isExtractedCharacter(c: unknown): c is ExtractedCharacter {
  return (
    typeof c === 'object' &&
    c !== null &&
    typeof (c as ExtractedCharacter).name === 'string' &&
    typeof (c as ExtractedCharacter).description === 'string'
  );
}

function isExtractedCharactersShape(value: unknown): value is { characters: ExtractedCharacter[] } {
  if (!value || typeof value !== 'object') return false;
  const v = value as { characters?: unknown };
  return Array.isArray(v.characters) && v.characters.every(isExtractedCharacter);
}

function parseSeries(value: unknown): SeriesInfo | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Partial<SeriesInfo>;
  if (!v.name || typeof v.name !== 'string' || !v.name.trim()) return undefined;
  return {
    name: v.name.trim(),
    index: typeof v.index === 'number' ? v.index : undefined,
    confidence:
      v.confidence === 'high' || v.confidence === 'medium' || v.confidence === 'low'
        ? v.confidence
        : undefined,
  };
}

export async function extractCharacters(
  book: ParsedFB2,
  options: ExtractCharactersOptions = {},
): Promise<ExtractedCharacters> {
  const { onProgress, signal, model, bookId } = options;
  const targetModel = model || getProModel();

  let priors: Awaited<ReturnType<typeof findSeriesContext>> = { candidateBooks: [], priors: [] };
  if (bookId) {
    onProgress?.('Ищу книги той же серии в локальной базе...');
    try {
      priors = await findSeriesContext(bookId);
      if (priors.priors.length > 0) {
        onProgress?.(
          `Нашёл ${priors.priors.length} известных персонажей из ${priors.candidateBooks.length} книг`,
        );
      }
    } catch (e) {
      console.warn('series priors lookup failed', e);
    }
  }

  onProgress?.(`Отправляю книгу на анализ через ${targetModel}...`);

  const prompt = extractCharactersPrompt(book, {
    priors: priors.priors,
    candidateSeriesBooks: priors.candidateBooks,
  });
  const raw = await callGeminiJson<unknown>(targetModel, prompt, { signal });

  if (!isExtractedCharactersShape(raw)) {
    throw new Error('Gemini вернул невалидную структуру для списка персонажей');
  }

  const series = parseSeries((raw as { series?: unknown }).series);

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
      suggestedTone: TONES.includes(c.suggestedTone) ? c.suggestedTone : 'neutral',
      styleHint: typeof c.styleHint === 'string' ? c.styleHint.trim() : '',
    }));

  onProgress?.(`Получено персонажей: ${sanitized.length}`);

  if (bookId && series) {
    try {
      await updateParsedBookSeries(bookId, series);
    } catch (e) {
      console.warn('failed to persist series info', e);
    }
  }

  return { characters: sanitized, series };
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
      voice: { voiceId, styleHint: char.styleHint || '' },
      color: colorForIndex(idx + 1),
      suggestedGender: char.suggestedGender,
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
    series: extracted.series,
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
        suggestedGender: char.suggestedGender || prev.suggestedGender,
        voice: {
          voiceId: prev.voice.voiceId,
          styleHint: prev.voice.styleHint || char.styleHint || '',
        },
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
      voice: { voiceId, styleHint: char.styleHint || '' },
      color: colorForIndex(existing.characters.length + idx + 1),
      suggestedGender: char.suggestedGender,
    };
  });

  const orphans = Array.from(byName.values());

  return {
    bookId,
    narrator: existing.narrator,
    characters: [...merged, ...orphans],
    series: extracted.series || existing.series,
    updatedAt: new Date().toISOString(),
  };
}
