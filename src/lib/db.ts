import type { Book, AIAnalysisResult } from '../types';

const DB_NAME = 'bookmap';
const DB_VERSION = 1;
const BOOKS_STORE = 'books';
const ANALYSIS_STORE = 'analysis';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ANALYSIS_STORE)) {
        db.createObjectStore(ANALYSIS_STORE, { keyPath: 'bookId' });
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
  const tx = db.transaction([BOOKS_STORE, ANALYSIS_STORE], 'readwrite');

  tx.objectStore(BOOKS_STORE).delete(bookId);
  tx.objectStore(ANALYSIS_STORE).delete(bookId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
