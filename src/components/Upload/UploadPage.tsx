import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import { parseFB2 } from '../../lib/fb2Parser';
import { analyzeBook, isAIConfigured } from '../../lib/aiService';
import { buildMapFromAnalysis } from '../../lib/mapBuilder';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { saveBook as saveBookToDb, saveParsedBook } from '../../lib/db';
import { useBookStore } from '../../store/bookStore';
import type { ParsedFB2, AIAnalysisResult } from '../../types';

export function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedBook, setParsedBook] = useState<ParsedFB2 | null>(null);
  const { isLoading, loadingMessage, error, setLoading, setError, setNodes, setEdges, setAnalysis, addBook, setCurrentBook } = useBookStore();
  const navigate = useNavigate();

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true, 'Читаю файл...');
    try {
      const text = await file.text();
      setLoading(true, 'Парсю FB2...');
      const parsed = parseFB2(text);
      setParsedBook(parsed);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при чтении файла');
      setLoading(false);
    }
  }, [setError, setLoading]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.fb2') || file.type === 'application/xml' || file.type === 'text/xml')) {
      handleFile(file);
    } else {
      setError('Пожалуйста, загрузите файл в формате .fb2');
    }
  }, [handleFile, setError]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = useCallback(async () => {
    if (!parsedBook) return;
    setError(null);
    setLoading(true, 'Анализирую книгу с помощью AI...');
    try {
      const analysisResult = await analyzeBook(parsedBook, (msg) => setLoading(true, msg));
      setAnalysis(analysisResult);
      setLoading(true, 'Строю карту...');
      const mapData = buildMapFromAnalysis(analysisResult);
      setNodes(mapData.nodes);
      setEdges(mapData.edges);

      const book = {
        id: crypto.randomUUID(),
        title: parsedBook.title,
        author: parsedBook.author,
        file_url: null,
        created_at: new Date().toISOString(),
      };

      try { await saveBookToDb(book, analysisResult); } catch (e) { console.warn('IndexedDB save failed:', e); }
      try { await saveParsedBook(book.id, parsedBook); } catch (e) { console.warn('IndexedDB save (parsedBook) failed:', e); }

      if (isSupabaseConfigured()) {
        try {
          const { data, error: dbError } = await getSupabase()
            .from('books').insert({ title: book.title, author: book.author }).select().single();
          if (dbError) throw dbError;
          if (data) book.id = data.id;
          await saveAnalysisToDb(book.id, analysisResult);
        } catch (dbErr) { console.warn('Supabase save failed:', dbErr); }
      }

      addBook(book);
      setCurrentBook(book);
      setLoading(false);
      navigate(`/map/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при анализе книги');
      setLoading(false);
    }
  }, [parsedBook, setError, setLoading, setAnalysis, setNodes, setEdges, addBook, setCurrentBook, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
              boxShadow: 'var(--glow-purple)',
            }}
          >
            <BookOpen size={28} color="#fff" />
          </div>
          <h1
            className="text-4xl font-extrabold mb-3 tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            BookMap
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Загрузите книгу в формате FB2 и получите интерактивную карту сюжета
          </p>
        </div>

        {!isAIConfigured() && (
          <div
            className="rounded-xl p-4 mb-6 flex items-start gap-3"
            style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
            }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <p className="text-[13px]" style={{ color: '#fbbf24' }}>
              Gemini API ключ не настроен. Нажмите <strong>&#9881;</strong> в шапке, чтобы добавить.
            </p>
          </div>
        )}

        <div
          className={`rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
            isDragging ? 'scale-[1.02]' : ''
          }`}
          style={{
            border: isDragging
              ? '2px dashed var(--neon-purple)'
              : '2px dashed var(--border)',
            background: isDragging
              ? 'rgba(167, 139, 250, 0.06)'
              : 'var(--bg-card)',
            boxShadow: isDragging ? 'var(--glow-purple)' : 'none',
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input id="file-input" type="file" accept=".fb2,.xml" className="hidden" onChange={handleFileInput} />

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: 'rgba(167, 139, 250, 0.1)',
              border: '1px solid var(--border)',
            }}
          >
            <Upload size={24} style={{ color: 'var(--neon-purple)' }} />
          </div>
          <p className="text-base font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {isDragging ? 'Отпустите файл здесь' : 'Перетащите FB2 файл сюда'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            или нажмите, чтобы выбрать файл
          </p>
        </div>

        {parsedBook && (
          <div
            className="mt-8 neon-border rounded-2xl p-6"
            style={{ background: 'var(--bg-card)' }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(167, 139, 250, 0.12)' }}
              >
                <FileText size={18} style={{ color: 'var(--neon-purple)' }} />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {parsedBook.title}
                </h2>
                {parsedBook.author && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{parsedBook.author}</p>
                )}
              </div>
            </div>

            <div
              className="mb-4 max-h-40 overflow-y-auto rounded-xl p-3"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {parsedBook.chapters.map((ch, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="font-mono w-6 text-center" style={{ color: 'var(--neon-purple)' }}>{ch.order}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{ch.title}</span>
                  <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                    {ch.text.length} символов
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !isAIConfigured()}
              className="w-full font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                color: '#fff',
                boxShadow: isLoading ? 'none' : 'var(--glow-purple)',
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loadingMessage}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Анализировать книгу
                </>
              )}
            </button>
          </div>
        )}

        {isLoading && !parsedBook && (
          <div className="mt-8 text-center">
            <div
              className="inline-flex items-center gap-3 neon-border rounded-xl px-6 py-4"
              style={{ background: 'var(--bg-card)' }}
            >
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--neon-purple)', borderTopColor: 'transparent' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{loadingMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="mt-6 rounded-xl p-4 flex items-start gap-3"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

async function saveAnalysisToDb(bookId: string, analysis: AIAnalysisResult) {
  const supabase = getSupabase();
  for (const chapter of analysis.chapters) {
    const { data: chapterData } = await supabase
      .from('chapters')
      .insert({ book_id: bookId, order_index: chapter.order, title: chapter.title, summary: chapter.summary })
      .select().single();
    if (!chapterData) continue;

    for (let i = 0; i < chapter.events.length; i++) {
      const event = chapter.events[i];
      const { data: eventData } = await supabase
        .from('plot_events')
        .insert({ book_id: bookId, chapter_id: chapterData.id, order_index: i, title: event.title, description: event.description, event_type: event.event_type })
        .select().single();
      if (!eventData) continue;

      for (const change of event.character_changes) {
        const { data: charData } = await supabase.from('characters').select('id').eq('book_id', bookId).eq('name', change.character_name).single();
        if (charData) {
          await supabase.from('character_events').insert({ character_id: charData.id, event_id: eventData.id, change_description: change.change_description, change_type: change.change_type });
        }
      }
    }
  }

  for (const char of analysis.characters) {
    await supabase.from('characters').insert({ book_id: bookId, name: char.name, description: char.description, first_appearance_chapter: char.first_appearance_chapter, color: char.color });
  }
}
