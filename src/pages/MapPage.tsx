import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useBookStore } from '../store/bookStore';
import { BookMap } from '../components/BookMap/BookMap';
import { getBookAnalysis, getAllBooks } from '../lib/db';
import { buildMapFromAnalysis } from '../lib/mapBuilder';

export function MapPage() {
  const { bookId: id } = useParams<{ bookId: string }>();
  const { nodes, edges, currentBook, isLoading, loadingMessage, setNodes, setEdges, setAnalysis, setCurrentBook, setLoading } = useBookStore();
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (loadedRef.current === id) return;

    let cancelled = false;

    async function loadFromDb() {
      setLoading(true, 'Загружаю данные...');
      try {
        const analysis = await getBookAnalysis(id!);
        if (cancelled) return;

        if (analysis) {
          loadedRef.current = id!;
          setAnalysis(analysis);
          const mapData = buildMapFromAnalysis(analysis);
          setNodes(mapData.nodes);
          setEdges(mapData.edges);

          const books = await getAllBooks();
          const book = books.find((b) => b.id === id);
          if (book) setCurrentBook(book);
        }
      } catch (err) {
        console.warn('Could not load from IndexedDB:', err);
      }
      if (!cancelled) setLoading(false);
    }

    loadFromDb();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-lg">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <p className="text-slate-400 text-lg">Нет данных для отображения</p>
          <p className="text-slate-500 text-sm mt-2">Загрузите и проанализируйте книгу</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <BookMap
        initialNodes={nodes}
        initialEdges={edges}
        bookTitle={currentBook?.title}
      />
      {id && (
        <Link
          to={`/audio/${id}`}
          className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
            color: '#fff',
            boxShadow: 'var(--glow-cyan)',
          }}
          title="Открыть Audio Director"
        >
          <Mic size={15} />
          Озвучить
        </Link>
      )}
    </div>
  );
}
