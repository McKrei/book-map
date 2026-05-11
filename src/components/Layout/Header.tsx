import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Upload, Library, Settings, Sun, Moon } from 'lucide-react';
import { SettingsModal } from '../Settings/SettingsModal';
import { useThemeStore } from '../../store/themeStore';

export function Header() {
  const location = useLocation();
  const isMap = location.pathname.startsWith('/map');
  const [showSettings, setShowSettings] = useState(false);
  const { theme, toggleTheme } = useThemeStore();

  const handleToggleTheme = () => {
    toggleTheme();
    document.body.setAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
  };

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl transition-all duration-200 ${
      active
        ? 'bg-[var(--neon-purple)]/15 text-[var(--neon-purple)] shadow-[var(--glow-purple)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
    }`;

  return (
    <>
      <header
        className="px-5 py-2.5 flex items-center justify-between z-50 relative"
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-shadow duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
              boxShadow: 'var(--glow-purple)',
            }}
          >
            <BookOpen size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            className="font-bold text-lg tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            BookMap
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <Link to="/" className={navLinkClass(!isMap && location.pathname !== '/books')}>
            <Upload size={15} />
            Загрузить
          </Link>
          <Link to="/books" className={navLinkClass(location.pathname === '/books')}>
            <Library size={15} />
            Книги
          </Link>

          <div className="w-px h-6 mx-1.5" style={{ background: 'var(--border)' }} />

          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-xl transition-all duration-200 hover:bg-[var(--bg-card)]"
            style={{ color: 'var(--text-muted)' }}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl transition-all duration-200 hover:bg-[var(--bg-card)]"
            style={{ color: 'var(--text-muted)' }}
            title="Настройки"
          >
            <Settings size={17} />
          </button>
        </nav>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
