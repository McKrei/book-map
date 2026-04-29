import { useBookStore } from '../store/bookStore';
import { BookMap } from '../components/BookMap/BookMap';

export function MapPage() {
  const { nodes, edges, currentBook, isLoading, loadingMessage } = useBookStore();

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
    <BookMap
      initialNodes={nodes}
      initialEdges={edges}
      bookTitle={currentBook?.title}
    />
  );
}
