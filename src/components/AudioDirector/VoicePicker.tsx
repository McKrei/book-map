import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { VOICES, VOICE_BY_ID } from '../../lib/voicePresets';
import type { VoiceGender } from '../../types/audio';

interface VoicePickerProps {
  value: string;
  onChange: (voiceId: string) => void;
  filterGender?: VoiceGender;
}

export function VoicePicker({ value, onChange, filterGender }: VoicePickerProps) {
  const [filter, setFilter] = useState<'all' | VoiceGender>(filterGender ?? 'all');

  const visibleVoices = useMemo(() => {
    if (filter === 'all') return VOICES;
    return VOICES.filter((v) => v.gender === filter);
  }, [filter]);

  const selectedVoice = VOICE_BY_ID[value];

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setFilter('all')}
          className="text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
          style={{
            background: filter === 'all' ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
            color: filter === 'all' ? 'var(--neon-purple)' : 'var(--text-muted)',
          }}
        >
          Все
        </button>
        <button
          onClick={() => setFilter('male')}
          className="text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
          style={{
            background: filter === 'male' ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
            color: filter === 'male' ? 'var(--neon-blue)' : 'var(--text-muted)',
          }}
        >
          ♂ Мужские
        </button>
        <button
          onClick={() => setFilter('female')}
          className="text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
          style={{
            background: filter === 'female' ? 'rgba(244, 114, 182, 0.15)' : 'transparent',
            color: filter === 'female' ? 'var(--neon-pink)' : 'var(--text-muted)',
          }}
        >
          ♀ Женские
        </button>
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg pl-3 pr-9 py-2 text-sm focus:outline-none cursor-pointer"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {visibleVoices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.gender === 'female' ? '♀' : '♂'} {v.id} — {v.style}, {v.pitch}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>

      {selectedVoice && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {selectedVoice.description}
        </p>
      )}
    </div>
  );
}
