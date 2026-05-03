import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Mic,
  Loader2,
  Square,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { BookCasting } from '../../types/audio';
import type { ChapterScript } from '../../types/script';
import { runTtsQueue, type QueueProgress } from '../../lib/ttsQueue';
import {
  assembleChapterAudio,
  getStoredChapterAudio,
} from '../../lib/chapterAudioBuilder';
import { isGeminiConfigured, isGeminiAuthError, isGeminiQuotaError } from '../../lib/geminiClient';

interface Props {
  script: ChapterScript;
  casting: BookCasting;
  onScriptUpdate: (script: ChapterScript) => void;
}

const POSITION_STORAGE_PREFIX = 'audiodirector_position_';

function positionKey(bookId: string, chapterOrder: number): string {
  return `${POSITION_STORAGE_PREFIX}${bookId}_${chapterOrder}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ChapterAudioPanel({ script, casting, onScriptUpdate }: Props) {
  const [liveProgress, setLiveProgress] = useState<QueueProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMs, setAudioMs] = useState<number | null>(null);
  const [assembling, setAssembling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [prevScriptKey, setPrevScriptKey] = useState(`${script.bookId}:${script.chapterOrder}`);

  const currentScriptKey = `${script.bookId}:${script.chapterOrder}`;
  if (prevScriptKey !== currentScriptKey) {
    setPrevScriptKey(currentScriptKey);
    setLiveProgress(null);
    setAudioUrl(null);
    setAudioMs(null);
    setError(null);
  }

  const progress: QueueProgress = liveProgress || calcProgress(script);

  useEffect(() => {
    let cancelled = false;
    let urlForCleanup: string | null = null;
    async function loadStored() {
      const stored = await getStoredChapterAudio(script.bookId, script.chapterOrder);
      if (cancelled || !stored) return;
      const url = URL.createObjectURL(stored.wav);
      urlForCleanup = url;
      setAudioUrl(url);
      setAudioMs(stored.durationMs);
    }
    loadStored();
    return () => {
      cancelled = true;
      if (urlForCleanup) URL.revokeObjectURL(urlForCleanup);
    };
  }, [script.bookId, script.chapterOrder]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    const key = positionKey(script.bookId, script.chapterOrder);
    const stored = window.localStorage.getItem(key);
    if (stored) {
      const t = Number(stored);
      if (Number.isFinite(t) && t > 0) {
        const onLoaded = () => {
          if (audio.duration && t < audio.duration - 0.5) {
            audio.currentTime = t;
          }
          audio.removeEventListener('loadedmetadata', onLoaded);
        };
        audio.addEventListener('loadedmetadata', onLoaded);
      }
    }
  }, [audioUrl, script.bookId, script.chapterOrder]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const key = positionKey(script.bookId, script.chapterOrder);
    let lastSaved = 0;
    const onTime = () => {
      const now = Date.now();
      if (now - lastSaved > 1500) {
        lastSaved = now;
        window.localStorage.setItem(key, String(audio.currentTime));
      }
    };
    const onEnd = () => {
      window.localStorage.removeItem(key);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [audioUrl, script.bookId, script.chapterOrder]);

  const handleGenerate = useCallback(async () => {
    if (!isGeminiConfigured()) {
      setError('Сначала добавьте Gemini API ключ в Settings');
      return;
    }
    if (!casting) {
      setError('Сначала составьте кастинг');
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsGenerating(true);
    setError(null);
    try {
      const final = await runTtsQueue({
        script,
        casting,
        parallelism: 3,
        signal: abortRef.current.signal,
        onProgress: (p) => setLiveProgress({ ...p }),
        onScriptUpdate: (s) => onScriptUpdate({ ...s }),
      });
      onScriptUpdate(final);
      const allDone = final.blocks.every((b) => b.audioStatus === 'done');
      if (allDone) {
        setAssembling(true);
        try {
          const assembled = await assembleChapterAudio(final);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const url = URL.createObjectURL(assembled.wav);
          setAudioUrl(url);
          setAudioMs(assembled.durationMs);
        } finally {
          setAssembling(false);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // graceful stop
      } else {
        let msg = err instanceof Error ? err.message : String(err);
        if (isGeminiAuthError(err)) msg = 'Gemini отверг ключ. Проверьте API key в Settings.';
        else if (isGeminiQuotaError(err))
          msg = 'Превышена квота Gemini TTS. Включите billing или подождите.';
        setError(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [script, casting, onScriptUpdate, audioUrl]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleAssemble = useCallback(async () => {
    setAssembling(true);
    setError(null);
    try {
      const assembled = await assembleChapterAudio(script);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(assembled.wav);
      setAudioUrl(url);
      setAudioMs(assembled.durationMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAssembling(false);
    }
  }, [script, audioUrl]);

  const handleDownload = useCallback(() => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${script.bookId.slice(0, 6)}_chapter_${script.chapterOrder}.wav`;
    a.click();
  }, [audioUrl, script.bookId, script.chapterOrder]);

  const total = script.blocks.length;
  const donePct = total > 0 ? Math.round((progress.done / total) * 100) : 0;
  const allDone = total > 0 && progress.done === total && progress.errors === 0;
  const hasErrors = progress.errors > 0;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h3
          className="text-base font-bold inline-flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          <Mic size={16} style={{ color: 'var(--neon-cyan)' }} />
          Озвучка главы
        </h3>
        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {progress.done} / {total} блоков{' '}
          {progress.fromCache > 0 && <>· {progress.fromCache} из кэша</>}
          {progress.errors > 0 && (
            <> · <span style={{ color: '#f87171' }}>{progress.errors} ошибок</span></>
          )}
        </div>
      </div>

      <div
        className="w-full rounded-full overflow-hidden mb-3"
        style={{ background: 'var(--bg-secondary)', height: 8 }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${donePct}%`,
            background: hasErrors
              ? 'linear-gradient(90deg, #ef4444, #fbbf24)'
              : allDone
                ? 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))'
                : 'linear-gradient(90deg, var(--neon-cyan), var(--neon-blue))',
            boxShadow: '0 0 12px rgba(34, 211, 238, 0.4)',
          }}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {!isGenerating && !allDone && (
          <button
            onClick={handleGenerate}
            disabled={!isGeminiConfigured() || total === 0}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
              color: '#fff',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <Play size={14} />
            {progress.done > 0 ? 'Продолжить озвучку' : 'Озвучить главу'}
          </button>
        )}

        {!isGenerating && allDone && (
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl"
            style={{
              background: 'rgba(167, 139, 250, 0.1)',
              color: 'var(--neon-purple)',
              border: '1px solid var(--border)',
            }}
            title="Перегенерировать (только изменённые блоки)"
          >
            <RefreshCw size={14} />
            Перегенерировать
          </button>
        )}

        {isGenerating && (
          <button
            onClick={handleStop}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <Square size={14} />
            Остановить
          </button>
        )}

        {isGenerating && (
          <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--neon-cyan)' }}>
            <Loader2 size={14} className="animate-spin" />
            Генерация · {progress.generating} в работе
          </span>
        )}

        {allDone && !audioUrl && !assembling && (
          <button
            onClick={handleAssemble}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl"
            style={{
              background: 'rgba(52, 211, 153, 0.12)',
              color: 'var(--neon-green)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
            }}
          >
            <CheckCircle2 size={14} />
            Собрать WAV
          </button>
        )}

        {assembling && (
          <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--neon-green)' }}>
            <Loader2 size={14} className="animate-spin" />
            Склеиваю аудио...
          </span>
        )}

        {audioUrl && (
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <Download size={14} />
            Скачать .wav
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-xl p-3 mb-3 inline-flex items-start gap-2 w-full"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <XCircle size={14} style={{ color: '#f87171', marginTop: 2 }} />
          <p className="text-[12px]" style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {hasErrors && !error && (
        <div
          className="rounded-xl p-3 mb-3 inline-flex items-start gap-2 w-full"
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
          }}
        >
          <AlertCircle size={14} style={{ color: '#fbbf24', marginTop: 2 }} />
          <p className="text-[12px]" style={{ color: '#fbbf24' }}>
            {progress.errors} блок(ов) с ошибкой. Проверьте кастинг и нажмите «Продолжить озвучку», чтобы повторить попытку.
          </p>
        </div>
      )}

      {audioUrl && (
        <div className="mt-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
            style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.95)' }}
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {audioMs && <>Длительность: {formatDuration(audioMs)} · </>}
            Позиция воспроизведения сохраняется автоматически — продолжите с любого места после перезагрузки.
          </p>
        </div>
      )}
    </div>
  );
}

function calcProgress(script: ChapterScript): QueueProgress {
  let done = 0;
  let generating = 0;
  let errors = 0;
  for (const b of script.blocks) {
    if (b.audioStatus === 'done') done++;
    else if (b.audioStatus === 'generating') generating++;
    else if (b.audioStatus === 'error') errors++;
  }
  return { total: script.blocks.length, done, generating, errors, fromCache: 0 };
}
