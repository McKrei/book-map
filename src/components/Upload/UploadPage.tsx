import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseFB2 } from '../../lib/fb2Parser';
import { analyzeBook, isAIConfigured } from '../../lib/aiService';
import { buildMapFromAnalysis } from '../../lib/mapBuilder';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useBookStore } from '../../store/bookStore';
import type { ParsedFB2 } from '../../types';

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

      if (isSupabaseConfigured()) {
        try {
          const { data, error: dbError } = await supabase
            .from('books')
            .insert({ title: book.title, author: book.author })
            .select()
            .single();

          if (dbError) throw dbError;
          if (data) book.id = data.id;

          await saveAnalysisToDb(book.id, analysisResult);
        } catch (dbErr) {
          console.warn('Could not save to Supabase:', dbErr);
        }
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            📚 BookMap
          </h1>
          <p className="text-slate-400 text-lg">
            Загрузите книгу в формате FB2 и получите интерактивную карту сюжета
          </p>
        </div>

        {!isAIConfigured() && (
          <div className="bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 mb-6">
            <p className="text-amber-300 text-sm">
              ⚠️ OpenRouter API ключ не настроен. Добавьте <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-200">VITE_OPENROUTER_API_KEY</code> в файл <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-200">.env</code>
            </p>
          </div>
        )}

        {!isSupabaseConfigured() && (
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4 mb-6">
            <p className="text-blue-300 text-sm">
              ℹ️ Supabase не настроен. Данные будут храниться только в текущей сессии. Добавьте <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-200">VITE_SUPABASE_URL</code> и <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-200">VITE_SUPABASE_ANON_KEY</code> в файл <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-200">.env</code>
            </p>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
            ${isDragging
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
            }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".fb2,.xml"
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="text-5xl mb-4">📖</div>
          <p className="text-white text-lg mb-2">
            {isDragging ? 'Отпустите файл здесь' : 'Перетащите FB2 файл сюда'}
          </p>
          <p className="text-slate-500 text-sm">
            или нажмите, чтобы выбрать файл
          </p>
        </div>

        {parsedBook && (
          <div className="mt-8 bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-bold text-xl mb-2">{parsedBook.title}</h2>
            {parsedBook.author && (
              <p className="text-slate-400 mb-1">Автор: {parsedBook.author}</p>
            )}
            <p className="text-slate-500 text-sm mb-4">
              Глав: {parsedBook.chapters.length}
            </p>

            <div className="mb-4 max-h-40 overflow-y-auto">
              {parsedBook.chapters.map((ch, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-sm">
                  <span className="text-indigo-400 font-mono w-6">{ch.order}</span>
                  <span className="text-slate-300">{ch.title}</span>
                  <span className="text-slate-600 text-xs ml-auto">
                    {ch.text.length} символов
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !isAIConfigured()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {isLoading ? loadingMessage : '🔍 Анализировать книгу'}
            </button>
          </div>
        )}

        {isLoading && !parsedBook && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-6 py-4">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-300">{loadingMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-900/30 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-300 text-sm">❌ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

async function saveAnalysisToDb(bookId: string, analysis: import('../../types').AIAnalysisResult) {
  for (const chapter of analysis.chapters) {
    const { data: chapterData } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        order_index: chapter.order,
        title: chapter.title,
        summary: chapter.summary,
      })
      .select()
      .single();

    if (!chapterData) continue;

    for (let i = 0; i < chapter.events.length; i++) {
      const event = chapter.events[i];
      const { data: eventData } = await supabase
        .from('plot_events')
        .insert({
          book_id: bookId,
          chapter_id: chapterData.id,
          order_index: i,
          title: event.title,
          description: event.description,
          event_type: event.event_type,
        })
        .select()
        .single();

      if (!eventData) continue;

      for (const change of event.character_changes) {
        const { data: charData } = await supabase
          .from('characters')
          .select('id')
          .eq('book_id', bookId)
          .eq('name', change.character_name)
          .single();

        if (charData) {
          await supabase.from('character_events').insert({
            character_id: charData.id,
            event_id: eventData.id,
            change_description: change.change_description,
            change_type: change.change_type,
          });
        }
      }
    }
  }

  for (const char of analysis.characters) {
    await supabase.from('characters').insert({
      book_id: bookId,
      name: char.name,
      description: char.description,
      first_appearance_chapter: char.first_appearance_chapter,
      color: char.color,
    });
  }
}
