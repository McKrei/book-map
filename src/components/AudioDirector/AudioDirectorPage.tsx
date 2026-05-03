import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mic, Sparkles, AlertCircle, ArrowLeft, Settings, Save, RefreshCw } from 'lucide-react';
import { getParsedBook, getCasting, saveCasting } from '../../lib/db';
import { extractCharacters, mergeCasting } from '../../lib/audioDirector';
import { isGeminiConfigured, isGeminiQuotaError, isGeminiAuthError } from '../../lib/geminiClient';
import { useAudioStore } from '../../store/audioStore';
import { CastingTable } from './CastingTable';
import type { BookCasting } from '../../types/audio';
import type { ParsedFB2 } from '../../types';

export function AudioDirectorPage() {
  const { bookId = '' } = useParams<{ bookId: string }>();
  const {
    casting,
    isExtracting,
    extractMessage,
    extractError,
    setBookId,
    setCasting,
    updateCharacter,
    updateNarrator,
    setExtracting,
    setExtractError,
  } = useAudioStore();

  const [parsedBook, setParsedBook] = useState<ParsedFB2 | null>(null);
  const [bookMissing, setBookMissing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const saveDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    setBookId(bookId);
    return () => {
      abortRef.current?.abort();
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    };
  }, [bookId, setBookId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!bookId) return;
      try {
        const [book, existingCasting] = await Promise.all([
          getParsedBook(bookId),
          getCasting(bookId),
        ]);
        if (cancelled) return;
        if (!book) {
          setBookMissing(true);
          return;
        }
        setParsedBook(book);
        setCasting(existingCasting);
      } catch (err) {
        console.error('Failed to load AudioDirector data', err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [bookId, setCasting]);

  useEffect(() => {
    if (!casting) return;
    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = window.setTimeout(async () => {
      try {
        await saveCasting(casting);
        setSavedAt(new Date().toLocaleTimeString('ru-RU'));
      } catch (err) {
        console.warn('Failed to persist casting', err);
      }
    }, 500);
    return () => {
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    };
  }, [casting]);

  const runExtraction = useCallback(async () => {
    if (!parsedBook) return;
    if (!isGeminiConfigured()) {
      setExtractError('Сначала добавьте Gemini API ключ в Settings');
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setExtracting(true, 'Подготавливаю запрос к Gemini Pro...');
    try {
      const extracted = await extractCharacters(parsedBook, {
        onProgress: (msg) => setExtracting(true, msg),
        signal: abortRef.current.signal,
      });
      const merged: BookCasting = mergeCasting(bookId, casting, extracted);
      setCasting(merged);
      await saveCasting(merged);
      setSavedAt(new Date().toLocaleTimeString('ru-RU'));
      setExtracting(false, '');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setExtracting(false, '');
        return;
      }
      console.error('Character extraction failed', err);
      let msg = err instanceof Error ? err.message : String(err);
      if (isGeminiAuthError(err)) {
        msg = 'Gemini отверг ключ. Проверьте API key в Settings.';
      } else if (isGeminiQuotaError(err)) {
        msg = 'Превышена квота Gemini. Включите billing в Google Cloud или переключите модель в Settings.';
      }
      setExtractError(msg);
    }
  }, [parsedBook, casting, bookId, setExtracting, setExtractError, setCasting]);

  if (!bookId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Книга не указана</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto p-6 md:p-8"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/books"
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft size={14} />
              К книгам
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <Link
              to={`/map/${bookId}`}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Карта сюжета
            </Link>
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

        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <Mic size={18} color="#fff" />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Audio Director
          </h1>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {parsedBook ? (
            <>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {parsedBook.title}
              </span>
              {parsedBook.author && <> · {parsedBook.author}</>}
              {' · '}
              {parsedBook.chapters.length} глав
            </>
          ) : (
            'Загружаю книгу...'
          )}
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
                Эта книга была загружена раньше, чем появился Audio Director.
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Загрузите FB2 заново через <Link to="/" className="underline">главную</Link> — мы сохраним полный текст для разметки и кастинга.
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
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: 'var(--neon-cyan)' }}>
                Добавьте Gemini API ключ
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Откройте Settings (шестерёнка в шапке) → Gemini API ключ. Ключ можно получить на{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  aistudio.google.com
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {parsedBook && !casting && !isExtracting && !bookMissing && (
          <button
            onClick={runExtraction}
            disabled={!isGeminiConfigured()}
            className="w-full rounded-2xl p-6 flex items-center justify-center gap-3 font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed mb-6"
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
              color: '#fff',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <Sparkles size={18} />
            Найти персонажей в книге
          </button>
        )}

        {isExtracting && (
          <div
            className="rounded-2xl p-6 flex items-center gap-3 mb-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="w-5 h-5 border-2 border-[var(--neon-cyan)]/30 border-t-[var(--neon-cyan)] rounded-full animate-spin" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {extractMessage || 'Работаю...'}
            </p>
          </div>
        )}

        {extractError && (
          <div
            className="rounded-2xl p-5 mb-6 flex items-start gap-3"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <p className="text-[13px]" style={{ color: '#ef4444' }}>{extractError}</p>
          </div>
        )}

        {casting && (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Кастинг ({casting.characters.length} персонажей + рассказчик)
                </h2>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  Выберите голос и опишите характер для каждого персонажа. Изменения сохраняются автоматически.
                </p>
              </div>
              <button
                onClick={runExtraction}
                disabled={isExtracting || !isGeminiConfigured()}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl transition-all duration-200 disabled:opacity-40"
                style={{
                  background: 'rgba(167, 139, 250, 0.1)',
                  color: 'var(--neon-purple)',
                  border: '1px solid var(--border)',
                }}
                title="Перезапустить экстракцию персонажей"
              >
                <RefreshCw size={14} />
                Переэкстрактить
              </button>
            </div>

            <CastingTable
              casting={casting}
              onNarratorVoiceChange={(voiceId) => updateNarrator({ voiceId })}
              onNarratorStyleChange={(styleHint) => updateNarrator({ styleHint })}
              onCharacterVoiceChange={(name, voiceId) =>
                updateCharacter(name, { voice: { ...findVoice(casting, name), voiceId } })
              }
              onCharacterStyleChange={(name, styleHint) =>
                updateCharacter(name, { voice: { ...findVoice(casting, name), styleHint } })
              }
            />

            <div
              className="mt-6 rounded-2xl p-4 text-[12px]"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Что дальше?
              </span>{' '}
              В следующих PR появится разметка глав на блоки реплик и генерация аудио. Сейчас кастинг сохраняется и будет использован автоматически.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function findVoice(casting: BookCasting, name: string) {
  const c = casting.characters.find((x) => x.name === name);
  return c?.voice ?? { voiceId: '', styleHint: '' };
}
