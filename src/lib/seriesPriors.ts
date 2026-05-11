import type { Book } from '../types';
import type { ParsedBookRecord, SeriesPriorCharacter, BookCasting } from '../types/audio';
import { getAllBooks, getAllParsedBooks, getCasting } from './db';

export interface SeriesContext {
  candidateBooks: { title: string; author: string }[];
  priors: SeriesPriorCharacter[];
}

function normalize(s: string): string {
  return (s || '').trim().toLowerCase();
}

export async function findSeriesContext(currentBookId: string): Promise<SeriesContext> {
  const [allBooks, parsed] = await Promise.all([getAllBooks(), getAllParsedBooks()]);

  const currentBook = allBooks.find((b) => b.id === currentBookId);
  const currentParsed = parsed.find((p) => p.bookId === currentBookId);

  if (!currentBook && !currentParsed) {
    return { candidateBooks: [], priors: [] };
  }

  const author = normalize(currentBook?.author || currentParsed?.author || '');
  const seriesName = currentParsed?.series?.name
    ? normalize(currentParsed.series.name)
    : '';

  const candidates: { book: Book; parsed: ParsedBookRecord | undefined }[] = [];
  for (const b of allBooks) {
    if (b.id === currentBookId) continue;
    const p = parsed.find((x) => x.bookId === b.id);
    const sameAuthor = author && normalize(b.author || p?.author || '') === author;
    const sameSeries =
      seriesName && p?.series?.name && normalize(p.series.name) === seriesName;
    if (sameAuthor || sameSeries) {
      candidates.push({ book: b, parsed: p });
    }
  }

  const candidateBooks = candidates.map(({ book, parsed: p }) => ({
    title: book.title || p?.title || '',
    author: book.author || p?.author || '',
  }));

  const priorsRaw = await Promise.all(
    candidates.map(async ({ book }) => {
      const casting = await getCasting(book.id).catch(() => null);
      return { book, casting };
    }),
  );

  const priors: SeriesPriorCharacter[] = [];
  const seenNames = new Set<string>();
  for (const { book, casting } of priorsRaw) {
    if (!casting) continue;
    for (const ch of casting.characters) {
      const key = ch.name.trim().toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      priors.push({
        name: ch.name,
        description: ch.description,
        voiceId: ch.voice.voiceId,
        styleHint: ch.voice.styleHint,
        fromBookTitle: book.title,
      });
    }
  }

  priors.sort((a, b) => Number(b.styleHint?.length || 0) - Number(a.styleHint?.length || 0));
  return { candidateBooks, priors: priors.slice(0, 50) };
}

export function applySeriesPriors(
  casting: BookCasting,
  priors: SeriesPriorCharacter[],
): BookCasting {
  if (priors.length === 0) return casting;
  const byName = new Map(priors.map((p) => [p.name.trim().toLowerCase(), p]));
  return {
    ...casting,
    characters: casting.characters.map((c) => {
      const prior = byName.get(c.name.trim().toLowerCase());
      if (!prior) return c;
      return {
        ...c,
        voice: {
          voiceId: c.voice.voiceId || prior.voiceId,
          styleHint: c.voice.styleHint || prior.styleHint,
        },
      };
    }),
  };
}
