import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Library } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { getAllBooks } from '../../lib/db';
import { useBookStore } from '../../store/bookStore';

export function BookList() {
  const { books, setBooks } = useBookStore();

  useEffect(() => {
    async function loadBooks() {
      try {
        const localBooks = await getAllBooks();
        if (localBooks.length > 0) {
          setBooks(localBooks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      } catch (err) {
        console.warn('Could not load from IndexedDB:', err);
      }

      if (isSupabaseConfigured()) {
        try {
          const { data } = await getSupabase().from('books').select('*').order('created_at', { ascending: false });
          if (data && data.length > 0) setBooks(data);
        } catch (err) {
          console.warn('Could not load from Supabase:', err);
        }
      }
    }
    loadBooks();
  }, [setBooks]);

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
              boxShadow: 'var(--glow-purple)',
            }}
          >
            <Library size={18} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Мои книги
          </h1>
        </div>

        {books.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(167, 139, 250, 0.1)', border: '1px solid var(--border)' }}
            >
              <BookOpen size={28} style={{ color: 'var(--neon-purple)' }} />
            </div>
            <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
              Пока нет загруженных книг
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-semibold py-2.5 px-6 rounded-xl transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                color: '#fff',
                boxShadow: 'var(--glow-purple)',
              }}
            >
              Загрузить книгу
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {books.map((book) => (
              <Link
                key={book.id}
                to={`/map/${book.id}`}
                className="neon-border rounded-2xl p-5 transition-all duration-200 group flex items-center justify-between"
                style={{ background: 'var(--bg-card)' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(167, 139, 250, 0.1)' }}
                  >
                    <BookOpen size={18} style={{ color: 'var(--neon-purple)' }} />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-base transition-colors duration-200"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {book.author}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(book.created_at).toLocaleDateString('ru-RU')}
                  </span>
                  <ChevronRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
