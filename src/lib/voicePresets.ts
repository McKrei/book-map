import type { Voice, VoiceGender, SuggestedTone } from '../types/audio';

export const VOICES: Voice[] = [
  { id: 'Zephyr', gender: 'female', style: 'Bright', pitch: 'higher', description: 'Bright and clear female voice' },
  { id: 'Puck', gender: 'male', style: 'Upbeat', pitch: 'middle', description: 'Upbeat and lively male voice', recommendedFor: ['main-young'] },
  { id: 'Charon', gender: 'male', style: 'Informative', pitch: 'lower', description: 'Calm and professional male voice', recommendedFor: ['narrator-male'] },
  { id: 'Kore', gender: 'female', style: 'Firm', pitch: 'middle', description: 'Strong and firm female voice', recommendedFor: ['leader'] },
  { id: 'Fenrir', gender: 'male', style: 'Excitable', pitch: 'lower-middle', description: 'Passionate and energetic male voice', recommendedFor: ['warrior'] },
  { id: 'Leda', gender: 'female', style: 'Youthful', pitch: 'higher', description: 'Youthful and energetic female voice', recommendedFor: ['child', 'main-young'] },
  { id: 'Orus', gender: 'male', style: 'Firm', pitch: 'lower-middle', description: 'Calm and firm male voice' },
  { id: 'Aoede', gender: 'female', style: 'Breezy', pitch: 'middle', description: 'Relaxed and natural female voice' },
  { id: 'Callirrhoe', gender: 'female', style: 'Easy-going', pitch: 'middle', description: 'Friendly and easy-going female voice' },
  { id: 'Autonoe', gender: 'female', style: 'Bright', pitch: 'middle', description: 'Bright and cheerful female voice' },
  { id: 'Enceladus', gender: 'male', style: 'Breathy', pitch: 'lower', description: 'Soft and breathy male voice' },
  { id: 'Iapetus', gender: 'male', style: 'Clear', pitch: 'lower-middle', description: 'Clear and clean male voice' },
  { id: 'Umbriel', gender: 'male', style: 'Easy-going', pitch: 'lower-middle', description: 'Relaxed and easy-going male voice' },
  { id: 'Algieba', gender: 'male', style: 'Smooth', pitch: 'lower', description: 'Smooth and flowing male voice' },
  { id: 'Despina', gender: 'female', style: 'Smooth', pitch: 'middle', description: 'Smooth and gentle female voice' },
  { id: 'Erinome', gender: 'female', style: 'Clear', pitch: 'middle', description: 'Clear and articulate female voice' },
  { id: 'Algenib', gender: 'male', style: 'Gravelly', pitch: 'lower', description: 'Gravelly and textured male voice', recommendedFor: ['elderly-male', 'antagonist'] },
  { id: 'Rasalgethi', gender: 'male', style: 'Informative', pitch: 'middle', description: 'Professional narrator male voice', recommendedFor: ['narrator-male'] },
  { id: 'Laomedeia', gender: 'female', style: 'Upbeat', pitch: 'higher', description: 'Positive and upbeat female voice' },
  { id: 'Achernar', gender: 'female', style: 'Soft', pitch: 'higher', description: 'Soft and warm female voice' },
  { id: 'Alnilam', gender: 'male', style: 'Firm', pitch: 'lower-middle', description: 'Confident and firm male voice', recommendedFor: ['leader'] },
  { id: 'Schedar', gender: 'male', style: 'Even', pitch: 'lower-middle', description: 'Even and steady male voice' },
  { id: 'Gacrux', gender: 'female', style: 'Mature', pitch: 'middle', description: 'Mature and steady female voice', recommendedFor: ['elderly-female'] },
  { id: 'Pulcherrima', gender: 'male', style: 'Forward', pitch: 'middle', description: 'Forward and enterprising male voice' },
  { id: 'Achird', gender: 'male', style: 'Friendly', pitch: 'lower-middle', description: 'Friendly and kind male voice' },
  { id: 'Zubenelgenubi', gender: 'male', style: 'Casual', pitch: 'lower-middle', description: 'Casual and relaxed male voice' },
  { id: 'Vindemiatrix', gender: 'female', style: 'Gentle', pitch: 'middle', description: 'Gentle and delicate female voice', recommendedFor: ['narrator-female'] },
  { id: 'Sadachbia', gender: 'male', style: 'Lively', pitch: 'lower', description: 'Lively and vivid male voice' },
  { id: 'Sadaltager', gender: 'male', style: 'Knowledgeable', pitch: 'middle', description: 'Knowledgeable and learned male voice', recommendedFor: ['scholar', 'elderly-male'] },
  { id: 'Sulafat', gender: 'female', style: 'Warm', pitch: 'middle', description: 'Warm and approachable female voice', recommendedFor: ['narrator-female'] },
];

export const VOICE_BY_ID: Record<string, Voice> = Object.fromEntries(
  VOICES.map((v) => [v.id, v]),
);

export const NARRATOR_DEFAULT_MALE = 'Charon';
export const NARRATOR_DEFAULT_FEMALE = 'Sulafat';

const NEON_PALETTE = [
  '#a78bfa', '#60a5fa', '#22d3ee', '#f472b6', '#34d399',
  '#fbbf24', '#f97316', '#ef4444', '#10b981', '#06b6d4',
  '#8b5cf6', '#ec4899', '#3b82f6', '#84cc16', '#e11d48',
];

export function colorForIndex(i: number): string {
  return NEON_PALETTE[i % NEON_PALETTE.length];
}

export interface VoiceSuggestionInput {
  gender?: VoiceGender | 'neutral';
  tone?: SuggestedTone;
  excludeIds?: string[];
}

export function suggestVoice(input: VoiceSuggestionInput = {}): string {
  const { gender, tone, excludeIds = [] } = input;

  const isExcluded = (id: string) => excludeIds.includes(id);

  const targetGender: VoiceGender = gender === 'female' ? 'female' : 'male';

  const matchByTone: Record<SuggestedTone, string[]> = {
    youthful: ['Leda', 'Puck', 'Laomedeia'],
    mature: ['Gacrux', 'Charon', 'Schedar', 'Sulafat'],
    elderly: ['Sadaltager', 'Algenib', 'Gacrux'],
    child: ['Leda', 'Laomedeia'],
    intimidating: ['Algenib', 'Algieba', 'Fenrir'],
    warm: ['Sulafat', 'Achernar', 'Achird'],
    authoritative: ['Alnilam', 'Kore', 'Rasalgethi'],
    neutral: ['Charon', 'Sulafat', 'Iapetus', 'Despina'],
  };

  const candidates = (tone ? matchByTone[tone] ?? matchByTone.neutral : matchByTone.neutral)
    .map((id) => VOICE_BY_ID[id])
    .filter((v): v is Voice => Boolean(v));

  const matched = candidates.find((v) => v.gender === targetGender && !isExcluded(v.id));
  if (matched) return matched.id;

  const anyOfGender = VOICES.find((v) => v.gender === targetGender && !isExcluded(v.id));
  if (anyOfGender) return anyOfGender.id;

  const anyVoice = VOICES.find((v) => !isExcluded(v.id));
  return anyVoice?.id ?? VOICES[0].id;
}
