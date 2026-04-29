import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { Book, AIAnalysisResult } from '../types';

interface BookState {
  books: Book[];
  currentBook: Book | null;
  nodes: Node[];
  edges: Edge[];
  analysis: AIAnalysisResult | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  setBooks: (books: Book[]) => void;
  setCurrentBook: (book: Book | null) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setAnalysis: (analysis: AIAnalysisResult | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  addBook: (book: Book) => void;
}

export const useBookStore = create<BookState>((set) => ({
  books: [],
  currentBook: null,
  nodes: [],
  edges: [],
  analysis: null,
  isLoading: false,
  loadingMessage: '',
  error: null,

  setBooks: (books) => set({ books }),
  setCurrentBook: (currentBook) => set({ currentBook }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setAnalysis: (analysis) => set({ analysis }),
  setLoading: (isLoading, loadingMessage = '') => set({ isLoading, loadingMessage }),
  setError: (error) => set({ error }),
  addBook: (book) => set((state) => ({ books: [...state.books, book] })),
}));
