import { useState } from 'react';
import { X, ExternalLink, CheckCircle, Mic } from 'lucide-react';
import {
  setGeminiApiKey,
  isGeminiConfigured,
  getProModel,
  setProModel,
  getFlashModel,
  setFlashModel,
  GEMINI_PRO_FALLBACKS,
  GEMINI_FLASH_FALLBACKS,
} from '../../lib/geminiClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [proModel, setProModelLocal] = useState(getProModel());
  const [flashModel, setFlashModelLocal] = useState(getFlashModel());
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(geminiKey);
    setProModel(proModel);
    setFlashModel(flashModel);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload();
    }, 800);
  };

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  } as const;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 overflow-y-auto py-10"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="neon-border rounded-2xl p-6 max-w-md w-full mx-4"
        style={{ background: 'var(--bg-card)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            Настройки
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-[var(--bg-secondary)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5">
          <label
            className="flex items-center gap-2 text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Mic size={14} style={{ color: 'var(--neon-cyan)' }} />
            Gemini API ключ
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200"
            style={inputStyle}
          />
          <p
            className="text-[12px] mt-2 flex items-center gap-1 flex-wrap"
            style={{ color: 'var(--text-muted)' }}
          >
            Используется для анализа книги, кастинга и TTS. Получите ключ на{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:underline"
              style={{ color: 'var(--neon-cyan)' }}
            >
              aistudio.google.com <ExternalLink size={10} />
            </a>
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label
                className="text-[12px] font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Модель для большой задачи (анализ всей книги)
              </label>
              <select
                value={proModel}
                onChange={(e) => setProModelLocal(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              >
                {GEMINI_PRO_FALLBACKS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-[12px] font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Модель для поглавных задач (разметка реплик)
              </label>
              <select
                value={flashModel}
                onChange={(e) => setFlashModelLocal(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              >
                {GEMINI_FLASH_FALLBACKS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-[12px] font-medium">
            {isGeminiConfigured() ? (
              <>
                <CheckCircle size={13} style={{ color: 'var(--neon-green)' }} />
                <span style={{ color: 'var(--neon-green)' }}>Gemini настроен</span>
              </>
            ) : (
              <span style={{ color: '#fbbf24' }}>Gemini не настроен</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200"
              style={{ color: 'var(--text-muted)' }}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: saved
                  ? 'var(--neon-green)'
                  : 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
                color: '#fff',
                boxShadow: saved ? 'none' : 'var(--glow-purple)',
              }}
            >
              {saved ? 'Сохранено!' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
