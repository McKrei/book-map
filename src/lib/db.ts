import type { Book, AIAnalysisResult, ParsedFB2 } from '../types';
import type { BookCasting, ParsedBookRecord } from '../types/audio';

const DB_NAME = 'bookmap';
const DB_VERSION = 2;
const BOOKS_STORE = 'books';
const ANALYSIS_STORE = 'analysis';
const PARSED_BOOKS_STORE = 'parsedBooks';
const CASTINGS_STORE = 'castings';

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
    [BOOKS_STORE, ANALYSIS_STORE, PARSED_BOOKS_STORE, CASTINGS_STORE],
    'readwrite',
  );

  tx.objectStore(BOOKS_STORE).delete(bookId);
  tx.objectStore(ANALYSIS_STORE).delete(bookId);
  if (tx.objectStoreNames.contains(PARSED_BOOKS_STORE)) {
    tx.objectStore(PARSED_BOOKS_STORE).delete(bookId);
  }
  if (tx.objectStoreNames.contains(CASTINGS_STORE)) {
    tx.objectStore(CASTINGS_STORE).delete(bookId);
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
