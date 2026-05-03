import { useRef, useState } from 'react';
import { User, Mic } from 'lucide-react';
import { VoicePicker } from './VoicePicker';
import type { CharacterCasting, VoiceSlot } from '../../types/audio';

interface BaseProps {
  voice: VoiceSlot;
  styleHint: string;
  onVoiceChange: (voiceId: string) => void;
  onStyleChange: (styleHint: string) => void;
}

export function NarratorRow({ voice, styleHint, onVoiceChange, onStyleChange }: BaseProps) {
  const [localStyle, setLocalStyle] = useState(styleHint);
  const [lastSyncedProp, setLastSyncedProp] = useState(styleHint);
  if (styleHint !== lastSyncedProp) {
    setLastSyncedProp(styleHint);
    setLocalStyle(styleHint);
  }
  const debounceRef = useRef<number | null>(null);

  const handleStyleInput = (next: string) => {
    setLocalStyle(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onStyleChange(next);
    }, 500);
  };

  return (
    <div
      className="rounded-2xl p-4 grid gap-4 md:grid-cols-[220px_minmax(220px,1fr)_minmax(220px,1.2fr)] items-start"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--glow-cyan)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
            boxShadow: 'var(--glow-cyan)',
          }}
        >
          <Mic size={18} color="#fff" />
        </div>
        <div>
          <div
            className="font-semibold text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            Рассказчик
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Системный слот
          </div>
        </div>
      </div>

      <div>
        <VoicePicker value={voice.voiceId} onChange={onVoiceChange} />
      </div>

      <div>
        <label
          className="text-[11px] font-medium mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          Стиль / характер / акцент
        </label>
        <textarea
          value={localStyle}
          onChange={(e) => handleStyleInput(e.target.value)}
          placeholder="Например: спокойный, выразительный, лёгкий восточный акцент"
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
    </div>
  );
}

interface CharacterRowProps extends BaseProps {
  character: CharacterCasting;
}

export function CharacterRow({
  character,
  voice,
  styleHint,
  onVoiceChange,
  onStyleChange,
}: CharacterRowProps) {
  const [localStyle, setLocalStyle] = useState(styleHint);
  const [lastSyncedProp, setLastSyncedProp] = useState(styleHint);
  if (styleHint !== lastSyncedProp) {
    setLastSyncedProp(styleHint);
    setLocalStyle(styleHint);
  }
  const debounceRef = useRef<number | null>(null);

  const handleStyleInput = (next: string) => {
    setLocalStyle(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onStyleChange(next);
    }, 500);
  };

  return (
    <div
      className="rounded-2xl p-4 grid gap-4 md:grid-cols-[220px_minmax(220px,1fr)_minmax(220px,1.2fr)] items-start"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: character.color,
            boxShadow: `0 0 16px ${character.color}40`,
          }}
        >
          <User size={18} color="#fff" />
        </div>
        <div>
          <div
            className="font-semibold text-sm flex items-center gap-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {character.name}
            {character.isMain && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  background: 'rgba(167, 139, 250, 0.15)',
                  color: 'var(--neon-purple)',
                }}
              >
                Главный
              </span>
            )}
          </div>
          {character.description && (
            <p
              className="text-[11px] mt-0.5 line-clamp-3"
              style={{ color: 'var(--text-muted)' }}
            >
              {character.description}
            </p>
          )}
        </div>
      </div>

      <div>
        <VoicePicker value={voice.voiceId} onChange={onVoiceChange} />
      </div>

      <div>
        <label
          className="text-[11px] font-medium mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          Стиль / характер / акцент
        </label>
        <textarea
          value={localStyle}
          onChange={(e) => handleStyleInput(e.target.value)}
          placeholder="Например: молодая, дерзкая, говорит быстро"
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
    </div>
  );
}
