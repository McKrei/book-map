import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  ListOrdered,
  Settings,
} from 'lucide-react';
import {
  getParsedBook,
  getCasting,
  getChapterScript,
  saveChapterScript,
  getChapterScriptsByBook,
} from '../../lib/db';
import { markupChapter } from '../../lib/scriptMarkup';
import { isGeminiConfigured, isGeminiQuotaError, isGeminiAuthError } from '../../lib/geminiClient';
import { useScriptStore } from '../../store/scriptStore';
import { ScriptBlockCard } from './ScriptBlockCard';
import { speakerVisualsForCasting } from './speakerColors';
import { ChapterAudioPanel } from './ChapterAudioPanel';
import { AnalysisPipeline } from '../Pipeline/AnalysisPipeline';
import type { PipelineStage } from '../Pipeline/AnalysisPipeline';
import { Sparkles as SparklesIcon, FileText, Users, Mic } from 'lucide-react';
import { createElement } from 'react';
import type { BookCasting } from '../../types/audio';
import type { ParsedFB2 } from '../../types';

const MARKUP_STAGES: PipelineStage[] = [
  {
    id: 'load',
    icon: createElement(FileText, { size: 14 }),
    label: 'Загрузка главы',
    matches: (m) => /загруж|подгот|подгрузка|reading/i.test(m),
  },
  {
    id: 'send',
    icon: createElement(SparklesIcon, { size: 14 }),
    label: 'Отправка в Gemini',
    matches: (m) => /отправ|gemini|разметку/i.test(m),
  },
  {
    id: 'parse',
    icon: createElement(Users, { size: 14 }),
    label: 'Разбор реплик',
    matches: (m) => /получено|блоков|разбор/i.test(m),
  },
  {
    id: 'ready',
    icon: createElement(Mic, { size: 14 }),
    label: 'Готов к озвучке',
    matches: () => false,
  },
];

export function ChapterScriptPage() {
  const { bookId = '', chapterOrder: orderStr = '' } = useParams<{
    bookId: string;
    chapterOrder: string;
  }>();
  const chapterOrder = Number(orderStr);
  const navigate = useNavigate();

  const {
    script,
    isMarkingUp,
    markupMessage,
    markupError,
    setKey,
    setScript,
    updateBlock,
    removeBlock,
    setMarkup,
    setMarkupError,
  } = useScriptStore();

  const [parsedBook, setParsedBook] = useState<ParsedFB2 | null>(null);
  const [casting, setCasting] = useState<BookCasting | null>(null);
  const [chapterScripts, setChapterScripts] = useState<{ chapterOrder: number; blockCount: number }[]>([]);
  const [bookMissing, setBookMissing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    setKey(bookId, chapterOrder);
    return () => {
      abortRef.current?.abort();
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    };
  }, [bookId, chapterOrder, setKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!bookId || !Number.isFinite(chapterOrder)) return;
      try {
        const [book, c, existing, all] = await Promise.all([
          getParsedBook(bookId),
          getCasting(bookId),
          getChapterScript(bookId, chapterOrder),
          getChapterScriptsByBook(bookId),
        ]);
        if (cancelled) return;
        if (!book) {
          setBookMissing(true);
          return;
        }
        setParsedBook(book);
        setCasting(c);
        setScript(existing);
        setChapterScripts(
          all.map((s) => ({ chapterOrder: s.chapterOrder, blockCount: s.blocks.length })),
        );
      } catch (err) {
        console.error('Failed to load chapter script', err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterOrder, setScript]);

  useEffect(() => {
    if (!script) return;
    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = window.setTimeout(async () => {
      try {
        await saveChapterScript(script);
        setSavedAt(new Date().toLocaleTimeString('ru-RU'));
      } catch (err) {
        console.warn('Failed to persist chapter script', err);
      }
    }, 500);
    return () => {
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    };
  }, [script]);

  const visuals = useMemo(() => speakerVisualsForCasting(casting), [casting]);
  const chapter = parsedBook?.chapters.find((c) => c.order === chapterOrder);

  const runMarkup = useCallback(async () => {
    if (!parsedBook || !chapter || !casting) return;
    if (!isGeminiConfigured()) {
      setMarkupError('Сначала добавьте Gemini API ключ в Settings');
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setMarkup(true, 'Загрузка главы...');
    try {
      const result = await markupChapter({
        bookId,
        chapterOrder,
        chapterTitle: chapter.title,
        text: chapter.text,
        casting,
        signal: abortRef.current.signal,
        onProgress: (msg) => setMarkup(true, msg),
      });
      setScript(result);
      await saveChapterScript(result);
      setChapterScripts((prev) => {
        const others = prev.filter((s) => s.chapterOrder !== chapterOrder);
        return [...others, { chapterOrder, blockCount: result.blocks.length }].sort(
          (a, b) => a.chapterOrder - b.chapterOrder,
        );
      });
      setSavedAt(new Date().toLocaleTimeString('ru-RU'));
      setMarkup(false, '');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMarkup(false, '');
        return;
      }
      console.error('Chapter markup failed', err);
      let msg = err instanceof Error ? err.message : String(err);
      if (isGeminiAuthError(err)) {
        msg = 'Gemini отверг ключ. Проверьте API key в Settings.';
      } else if (isGeminiQuotaError(err)) {
        msg = 'Превышена квота Gemini. Включите billing или переключите модель в Settings.';
      }
      setMarkupError(msg);
    }
  }, [
    parsedBook,
    chapter,
    casting,
    bookId,
    chapterOrder,
    setMarkup,
    setMarkupError,
    setScript,
  ]);

  const goToChapter = useCallback(
    (order: number) => {
      navigate(`/audio/${bookId}/chapter/${order}`);
    },
    [navigate, bookId],
  );

  const totalChapters = parsedBook?.chapters.length || 0;
  const prevChapter = chapterOrder > 1 ? chapterOrder - 1 : null;
  const nextChapter = chapterOrder < totalChapters ? chapterOrder + 1 : null;

  if (!bookId || !Number.isFinite(chapterOrder)) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Глава не указана</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex h-full">
        <aside
          className="w-72 shrink-0 border-r overflow-y-auto"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <Link
              to={`/audio/${bookId}`}
              className="inline-flex items-center gap-1.5 text-[12px] hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft size={12} />
              К Audio Director
            </Link>
            <h2
              className="text-[14px] font-bold mt-2 flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              <ListOrdered size={14} />
              Главы
            </h2>
          </div>
          <div className="px-2 py-2">
            {parsedBook?.chapters.map((ch) => {
              const status = chapterScripts.find((s) => s.chapterOrder === ch.order);
              const isActive = ch.order === chapterOrder;
              return (
                <button
                  key={ch.order}
                  onClick={() => goToChapter(ch.order)}
                  className="w-full text-left rounded-lg px-3 py-2 mb-1 transition-colors"
                  style={{
                    background: isActive ? 'rgba(167, 139, 250, 0.18)' : 'transparent',
                    border: isActive ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid transparent',
                  }}
                >
                  <div
                    className="text-[12px] font-medium flex items-center justify-between gap-2"
                    style={{ color: isActive ? 'var(--neon-purple)' : 'var(--text-secondary)' }}
                  >
                    <span className="truncate flex-1">
                      {ch.order}. {ch.title || 'Без названия'}
                    </span>
                    {status && status.blockCount > 0 && (
                      <span
                        className="text-[10px] rounded-full px-1.5 py-0.5 shrink-0"
                        style={{
                          background: 'rgba(52, 211, 153, 0.12)',
                          color: 'var(--neon-green)',
                        }}
                      >
                        {status.blockCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            }) || (
              <p className="text-[12px] px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                Загрузка...
              </p>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => prevChapter && goToChapter(prevChapter)}
                  disabled={!prevChapter}
                  className="inline-flex items-center gap-1 text-[12px] font-medium rounded-md px-2 py-1.5 disabled:opacity-30"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <ChevronLeft size={14} />
                  Пред.
                </button>
                <button
                  onClick={() => nextChapter && goToChapter(nextChapter)}
                  disabled={!nextChapter}
                  className="inline-flex items-center gap-1 text-[12px] font-medium rounded-md px-2 py-1.5 disabled:opacity-30"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  След.
                  <ChevronRight size={14} />
                </button>
              </div>
              {savedAt && (
                <div
                  className="inline-flex items-center gap-1.5 text-[12px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Save size={12} />
                  Сохранено в {savedAt}
                </div>
              )}
            </div>

            <h1
              className="text-2xl font-bold tracking-tight mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Глава {chapterOrder}: {chapter?.title || 'Без названия'}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {parsedBook?.title}
              {parsedBook?.author && <> · {parsedBook.author}</>}
              {chapter && <> · {chapter.text.length.toLocaleString('ru-RU')} символов</>}
            </p>

            {bookMissing && (
              <div
                className="rounded-2xl p-5 mb-6 flex items-start gap-3"
                style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
                <div className="flex-1">
                  <p className="text-[13px] font-medium" style={{ color: '#fbbf24' }}>
                    Книга не найдена в локальной базе.
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Загрузите FB2 заново через <Link to="/" className="underline">главную</Link>.
                  </p>
                </div>
              </div>
            )}

            {!isGeminiConfigured() && (
              <div
                className="rounded-2xl p-5 mb-6 flex items-start gap-3"
                style={{
                  background: 'rgba(34, 211, 238, 0.06)',
                  border: '1px solid rgba(34, 211, 238, 0.25)',
                }}
              >
                <Settings size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--neon-cyan)' }} />
                <p className="text-[13px]" style={{ color: 'var(--neon-cyan)' }}>
                  Добавьте Gemini API ключ в Settings, чтобы разметить главу.
                </p>
              </div>
            )}

            {!casting && parsedBook && !bookMissing && (
              <div
                className="rounded-2xl p-5 mb-6 flex items-start gap-3"
                style={{
                  background: 'rgba(167, 139, 250, 0.08)',
                  border: '1px solid rgba(167, 139, 250, 0.25)',
                }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--neon-purple)' }} />
                <div className="flex-1">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--neon-purple)' }}>
                    Сначала составьте кастинг.
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    <Link to={`/audio/${bookId}`} className="underline">
                      Перейти в Audio Director
                    </Link>{' '}
                    и нажать «Найти персонажей».
                  </p>
                </div>
              </div>
            )}

            {script && !isMarkingUp && (
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Скрипт ({script.blocks.length} блоков)
                </h2>
                <button
                  onClick={runMarkup}
                  disabled={isMarkingUp || !isGeminiConfigured() || !casting}
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: 'rgba(167, 139, 250, 0.1)',
                    color: 'var(--neon-purple)',
                    border: '1px solid var(--border)',
                  }}
                  title="Перезапустить разметку"
                >
                  <RefreshCw size={14} />
                  Переразметить
                </button>
              </div>
            )}

            {parsedBook && casting && !script && !isMarkingUp && !bookMissing && (
              <button
                onClick={runMarkup}
                disabled={!isGeminiConfigured()}
                className="w-full rounded-2xl p-6 flex items-center justify-center gap-3 font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mb-6"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                  color: '#fff',
                  boxShadow: 'var(--glow-purple)',
                }}
              >
                <Sparkles size={18} />
                Разметить главу на блоки реплик
              </button>
            )}

            {isMarkingUp && (
              <div className="mb-6">
                <AnalysisPipeline stages={MARKUP_STAGES} message={markupMessage || 'Работаю...'} />
              </div>
            )}

            {markupError && (
              <div
                className="rounded-2xl p-5 mb-6 flex items-start gap-3"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                <p className="text-[13px]" style={{ color: '#ef4444' }}>{markupError}</p>
              </div>
            )}

            {script && casting && (
              <div className="mb-6">
                <ChapterAudioPanel
                  script={script}
                  casting={casting}
                  onScriptUpdate={setScript}
                />
              </div>
            )}

            {script && (
              <div className="space-y-2.5">
                {script.blocks.map((block) => (
                  <ScriptBlockCard
                    key={block.id}
                    block={block}
                    visuals={visuals}
                    casting={casting}
                    onChangeSpeaker={(speaker) => updateBlock(block.id, { speaker })}
                    onChangeText={(text) =>
                      updateBlock(block.id, {
                        text,
                        audioStatus: 'pending',
                        audioCacheKey: undefined,
                      })
                    }
                    onChangeEmotion={(emotion) => updateBlock(block.id, { emotion })}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
