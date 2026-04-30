import { useState } from 'react';
import { X, Key, ExternalLink, CheckCircle } from 'lucide-react';
import { setApiKey, isAIConfigured } from '../../lib/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [key, setKey] = useState(localStorage.getItem('openrouter_api_key') || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload();
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
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
          <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            <Key size={14} style={{ color: 'var(--neon-purple)' }} />
            OpenRouter API ключ
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-200"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <p className="text-[12px] mt-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            Получите ключ на
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:underline"
              style={{ color: 'var(--neon-purple)' }}
            >
              openrouter.ai <ExternalLink size={10} />
            </a>
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium flex items-center gap-1.5">
            {isAIConfigured() ? (
              <>
                <CheckCircle size={13} style={{ color: 'var(--neon-green)' }} />
                <span style={{ color: 'var(--neon-green)' }}>AI настроен</span>
              </>
            ) : (
              <span style={{ color: '#fbbf24' }}>AI не настроен</span>
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
                background: saved ? 'var(--neon-green)' : 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
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
