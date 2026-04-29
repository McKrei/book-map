import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useBookStore } from '../../store/bookStore';

export function BookList() {
  const { books, setBooks } = useBookStore();

  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setBooks(data);
        });
    }
  }, [setBooks]);

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Мои книги</h1>

        {books.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-slate-400 text-lg mb-4">Пока нет загруженных книг</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
            >
              Загрузить книгу
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {books.map((book) => (
              <Link
                key={book.id}
                to={`/map/${book.id}`}
                className="bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-indigo-500/10 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg group-hover:text-indigo-400 transition-colors">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-slate-400 text-sm mt-1">{book.author}</p>
                    )}
                  </div>
                  <div className="text-slate-600 text-sm">
                    {new Date(book.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
