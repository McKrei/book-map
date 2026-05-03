import type { BookCasting } from '../../types/audio';
import { NARRATOR_SPEAKER } from '../../types/script';

export function speakerVisualsForCasting(casting: BookCasting | null) {
  return buildSpeakerVisuals(casting);
}

export interface SpeakerVisual {
  name: string;
  label: string;
  color: string;
  background: string;
  border: string;
}

const NARRATOR_VISUAL: SpeakerVisual = {
  name: NARRATOR_SPEAKER,
  label: 'Рассказчик',
  color: '#94a3b8',
  background: 'rgba(148, 163, 184, 0.08)',
  border: 'rgba(148, 163, 184, 0.25)',
};

export function buildSpeakerVisuals(casting: BookCasting | null): Record<string, SpeakerVisual> {
  const map: Record<string, SpeakerVisual> = {
    [NARRATOR_SPEAKER]: NARRATOR_VISUAL,
  };
  if (!casting) return map;
  for (const c of casting.characters) {
    const base = c.color || '#a78bfa';
    map[c.name] = {
      name: c.name,
      label: c.name,
      color: base,
      background: hexToRgba(base, 0.1),
      border: hexToRgba(base, 0.35),
    };
  }
  return map;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return `rgba(167, 139, 250, ${alpha})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getSpeakerVisual(
  visuals: Record<string, SpeakerVisual>,
  speakerName: string,
): SpeakerVisual {
  return visuals[speakerName] || NARRATOR_VISUAL;
}
