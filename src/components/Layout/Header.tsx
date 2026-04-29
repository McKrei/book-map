import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SettingsModal } from '../Settings/SettingsModal';

export function Header() {
  const location = useLocation();
  const isMap = location.pathname.startsWith('/map');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 px-6 py-3 flex items-center justify-between z-50 relative">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">📚</span>
          <span className="text-white font-bold text-lg">BookMap</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              !isMap && location.pathname !== '/books' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Загрузить
          </Link>
          <Link
            to="/books"
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              location.pathname === '/books' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Книги
          </Link>
          <button
            onClick={() => setShowSettings(true)}
            className="text-slate-400 hover:text-white transition-colors text-lg"
            title="Настройки"
          >
            ⚙️
          </button>
        </nav>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
