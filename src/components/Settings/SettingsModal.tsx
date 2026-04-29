import { useState } from 'react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-bold text-xl mb-4">Настройки</h2>

        <div className="mb-4">
          <label className="block text-slate-400 text-sm mb-2">OpenRouter API ключ</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <p className="text-slate-500 text-xs mt-2">
            Получите ключ на <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">openrouter.ai/keys</a>
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs">
            {isAIConfigured()
              ? <span className="text-emerald-400">AI настроен</span>
              : <span className="text-amber-400">AI не настроен</span>
            }
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-semibold"
            >
              {saved ? 'Сохранено!' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
