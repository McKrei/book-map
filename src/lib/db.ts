import type { Book, AIAnalysisResult, ParsedFB2 } from '../types';
import type { BookCasting, ParsedBookRecord } from '../types/audio';
import type { ChapterScript, ChapterAudioRecord } from '../types/script';

const DB_NAME = 'bookmap';
const DB_VERSION = 3;
const BOOKS_STORE = 'books';
const ANALYSIS_STORE = 'analysis';
const PARSED_BOOKS_STORE = 'parsedBooks';
const CASTINGS_STORE = 'castings';
const CHAPTER_SCRIPTS_STORE = 'chapterScripts';
const AUDIO_CACHE_STORE = 'audioCache';
const CHAPTER_AUDIO_STORE = 'chapterAudio';

interface AudioCacheEntry {
  cacheKey: string;
  pcmBytes: ArrayBuffer;
  durationMs: number;
  voiceId: string;
  text: string;
  createdAt: string;
}

function chapterScriptKey(bookId: string, chapterOrder: number): string {
  return `${bookId}:${chapterOrder}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ANALYSIS_STORE)) {
        db.createObjectStore(ANALYSIS_STORE, { keyPath: 'bookId' });
      }
      if (event.oldVersion < 2) {
        if (!db.objectStoreNames.contains(PARSED_BOOKS_STORE)) {
          db.createObjectStore(PARSED_BOOKS_STORE, { keyPath: 'bookId' });
        }
        if (!db.objectStoreNames.contains(CASTINGS_STORE)) {
          db.createObjectStore(CASTINGS_STORE, { keyPath: 'bookId' });
        }
      }
      if (event.oldVersion < 3) {
        if (!db.objectStoreNames.contains(CHAPTER_SCRIPTS_STORE)) {
          const store = db.createObjectStore(CHAPTER_SCRIPTS_STORE, { keyPath: 'key' });
          store.createIndex('bookId', 'bookId', { unique: false });
        }
        if (!db.objectStoreNames.contains(AUDIO_CACHE_STORE)) {
          db.createObjectStore(AUDIO_CACHE_STORE, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(CHAPTER_AUDIO_STORE)) {
          db.createObjectStore(CHAPTER_AUDIO_STORE, { keyPath: 'key' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBook(book: Book, analysis: AIAnalysisResult): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([BOOKS_STORE, ANALYSIS_STORE], 'readwrite');

  tx.objectStore(BOOKS_STORE).put(book);
  tx.objectStore(ANALYSIS_STORE).put({ bookId: book.id, data: analysis });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await openDB();
  const tx = db.transaction(BOOKS_STORE, 'readonly');
  const store = tx.objectStore(BOOKS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getBookAnalysis(bookId: string): Promise<AIAnalysisResult | null> {
  const db = await openDB();
  const tx = db.transaction(ANALYSIS_STORE, 'readonly');
  const store = tx.objectStore(ANALYSIS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.get(bookId);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.data : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(
    [
      BOOKS_STORE,
      ANALYSIS_STORE,
      PARSED_BOOKS_STORE,
      CASTINGS_STORE,
      CHAPTER_SCRIPTS_STORE,
      CHAPTER_AUDIO_STORE,
    ].filter((s) => db.objectStoreNames.contains(s)),
    'readwrite',
  );

  if (tx.objectStoreNames.contains(BOOKS_STORE)) tx.objectStore(BOOKS_STORE).delete(bookId);
  if (tx.objectStoreNames.contains(ANALYSIS_STORE)) tx.objectStore(ANALYSIS_STORE).delete(bookId);
  if (tx.objectStoreNames.contains(PARSED_BOOKS_STORE)) {
    tx.objectStore(PARSED_BOOKS_STORE).delete(bookId);
  }
  if (tx.objectStoreNames.contains(CASTINGS_STORE)) {
    tx.objectStore(CASTINGS_STORE).delete(bookId);
  }
  if (tx.objectStoreNames.contains(CHAPTER_SCRIPTS_STORE)) {
    const store = tx.objectStore(CHAPTER_SCRIPTS_STORE);
    const idx = store.index('bookId');
    idx.openKeyCursor(IDBKeyRange.only(bookId)).onsuccess = (e) => {
      const cur = (e.target as IDBRequest<IDBCursor>).result;
      if (cur) {
        store.delete(cur.primaryKey);
        cur.continue();
      }
    };
  }
  if (tx.objectStoreNames.contains(CHAPTER_AUDIO_STORE)) {
    const store = tx.objectStore(CHAPTER_AUDIO_STORE);
    store.openKeyCursor().onsuccess = (e) => {
      const cur = (e.target as IDBRequest<IDBCursor>).result;
      if (cur && typeof cur.primaryKey === 'string' && cur.primaryKey.startsWith(`${bookId}:`)) {
        store.delete(cur.primaryKey);
      }
      if (cur) cur.continue();
    };
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveParsedBook(bookId: string, parsed: ParsedFB2): Promise<void> {
  const db = await openDB();
  const existing = await new Promise<ParsedBookRecord | null>((resolve, reject) => {
    const tx = db.transaction(PARSED_BOOKS_STORE, 'readonly');
    const request = tx.objectStore(PARSED_BOOKS_STORE).get(bookId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  const record: ParsedBookRecord = {
    bookId,
    ...parsed,
    series: existing?.series,
  };
  const tx = db.transaction(PARSED_BOOKS_STORE, 'readwrite');
  tx.objectStore(PARSED_BOOKS_STORE).put(record);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getParsedBook(bookId: string): Promise<ParsedBookRecord | null> {
  const db = await openDB();
  const tx = db.transaction(PARSED_BOOKS_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(PARSED_BOOKS_STORE).get(bookId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllParsedBooks(): Promise<ParsedBookRecord[]> {
  const db = await openDB();
  const tx = db.transaction(PARSED_BOOKS_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(PARSED_BOOKS_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function updateParsedBookSeries(
  bookId: string,
  series: ParsedBookRecord['series'],
): Promise<void> {
  const db = await openDB();
  const existing = await new Promise<ParsedBookRecord | null>((resolve, reject) => {
    const tx = db.transaction(PARSED_BOOKS_STORE, 'readonly');
    const request = tx.objectStore(PARSED_BOOKS_STORE).get(bookId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  if (!existing) return;
  const next: ParsedBookRecord = { ...existing, series };
  const tx = db.transaction(PARSED_BOOKS_STORE, 'readwrite');
  tx.objectStore(PARSED_BOOKS_STORE).put(next);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveCasting(casting: BookCasting): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CASTINGS_STORE, 'readwrite');
  tx.objectStore(CASTINGS_STORE).put(casting);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCasting(bookId: string): Promise<BookCasting | null> {
  const db = await openDB();
  const tx = db.transaction(CASTINGS_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(CASTINGS_STORE).get(bookId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

interface ChapterScriptRecord extends ChapterScript {
  key: string;
}

export async function saveChapterScript(script: ChapterScript): Promise<void> {
  const db = await openDB();
  const record: ChapterScriptRecord = {
    ...script,
    key: chapterScriptKey(script.bookId, script.chapterOrder),
  };
  const tx = db.transaction(CHAPTER_SCRIPTS_STORE, 'readwrite');
  tx.objectStore(CHAPTER_SCRIPTS_STORE).put(record);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getChapterScript(
  bookId: string,
  chapterOrder: number,
): Promise<ChapterScript | null> {
  const db = await openDB();
  const tx = db.transaction(CHAPTER_SCRIPTS_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(CHAPTER_SCRIPTS_STORE).get(
      chapterScriptKey(bookId, chapterOrder),
    );
    request.onsuccess = () => {
      const r = request.result as ChapterScriptRecord | undefined;
      if (!r) return resolve(null);
      const { ...script } = r;
      delete (script as Partial<ChapterScriptRecord>).key;
      resolve(script as ChapterScript);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getChapterScriptsByBook(bookId: string): Promise<ChapterScript[]> {
  const db = await openDB();
  const tx = db.transaction(CHAPTER_SCRIPTS_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const idx = tx.objectStore(CHAPTER_SCRIPTS_STORE).index('bookId');
    const request = idx.getAll(IDBKeyRange.only(bookId));
    request.onsuccess = () => {
      const items = (request.result || []) as ChapterScriptRecord[];
      resolve(
        items.map((r) => {
          const { ...rest } = r;
          delete (rest as Partial<ChapterScriptRecord>).key;
          return rest as ChapterScript;
        }),
      );
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteChapterScript(
  bookId: string,
  chapterOrder: number,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CHAPTER_SCRIPTS_STORE, 'readwrite');
  tx.objectStore(CHAPTER_SCRIPTS_STORE).delete(chapterScriptKey(bookId, chapterOrder));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioCacheEntry(cacheKey: string): Promise<AudioCacheEntry | null> {
  const db = await openDB();
  const tx = db.transaction(AUDIO_CACHE_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(AUDIO_CACHE_STORE).get(cacheKey);
    request.onsuccess = () => resolve((request.result as AudioCacheEntry) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function putAudioCacheEntry(entry: AudioCacheEntry): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(AUDIO_CACHE_STORE, 'readwrite');
  tx.objectStore(AUDIO_CACHE_STORE).put(entry);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

interface ChapterAudioStored extends ChapterAudioRecord {
  key: string;
}

export async function saveChapterAudio(record: ChapterAudioRecord): Promise<void> {
  const db = await openDB();
  const stored: ChapterAudioStored = {
    ...record,
    key: chapterScriptKey(record.bookId, record.chapterOrder),
  };
  const tx = db.transaction(CHAPTER_AUDIO_STORE, 'readwrite');
  tx.objectStore(CHAPTER_AUDIO_STORE).put(stored);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getChapterAudio(
  bookId: string,
  chapterOrder: number,
): Promise<ChapterAudioRecord | null> {
  const db = await openDB();
  const tx = db.transaction(CHAPTER_AUDIO_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const request = tx.objectStore(CHAPTER_AUDIO_STORE).get(
      chapterScriptKey(bookId, chapterOrder),
    );
    request.onsuccess = () => {
      const r = request.result as ChapterAudioStored | undefined;
      if (!r) return resolve(null);
      const { ...rest } = r;
      delete (rest as Partial<ChapterAudioStored>).key;
      resolve(rest as ChapterAudioRecord);
    };
    request.onerror = () => reject(request.error);
  });
}

export type { AudioCacheEntry };
