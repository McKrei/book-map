import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ChangeData {
  characterName: string;
  changeDescription: string;
  changeType: string;
  color: string;
  [key: string]: unknown;
}

const CHANGE_ICONS: Record<string, string> = {
  development: '📈',
  death: '💀',
  transformation: '🔄',
  revelation: '💡',
  relationship: '💕',
};

export function CharacterChangeNode({ data }: NodeProps) {
  const { characterName, changeDescription, changeType, color } = data as unknown as ChangeData;
  const icon = CHANGE_ICONS[changeType] || '📌';

  return (
    <div
      className="rounded-lg px-3 py-2 shadow-md min-w-[220px] max-w-[240px]"
      style={{
        backgroundColor: `${color}10`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" style={{ backgroundColor: color }} />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">{icon}</span>
        <span className="text-xs font-semibold" style={{ color }}>{characterName}</span>
      </div>

      <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{changeDescription}</p>
    </div>
  );
}
