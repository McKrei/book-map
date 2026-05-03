import { CharacterRow, NarratorRow } from './CastingRow';
import type { BookCasting } from '../../types/audio';

interface CastingTableProps {
  casting: BookCasting;
  onNarratorVoiceChange: (voiceId: string) => void;
  onNarratorStyleChange: (style: string) => void;
  onCharacterVoiceChange: (name: string, voiceId: string) => void;
  onCharacterStyleChange: (name: string, style: string) => void;
}

export function CastingTable({
  casting,
  onNarratorVoiceChange,
  onNarratorStyleChange,
  onCharacterVoiceChange,
  onCharacterStyleChange,
}: CastingTableProps) {
  return (
    <div className="flex flex-col gap-3">
      <NarratorRow
        voice={casting.narrator}
        styleHint={casting.narrator.styleHint}
        onVoiceChange={onNarratorVoiceChange}
        onStyleChange={onNarratorStyleChange}
      />
      {casting.characters.map((c) => (
        <CharacterRow
          key={c.name}
          character={c}
          voice={c.voice}
          styleHint={c.voice.styleHint}
          onVoiceChange={(voiceId) => onCharacterVoiceChange(c.name, voiceId)}
          onStyleChange={(style) => onCharacterStyleChange(c.name, style)}
        />
      ))}
    </div>
  );
}
