import { Handle, Position, type NodeProps } from '@xyflow/react';

interface CharacterData {
  name: string;
  description: string;
  color: string;
  firstAppearance: number;
  [key: string]: unknown;
}

export function CharacterNode({ data }: NodeProps) {
  const { name, description, color, firstAppearance } = data as unknown as CharacterData;

  return (
    <div
      className="rounded-xl px-5 py-4 shadow-lg min-w-[240px] max-w-[260px]"
      style={{
        backgroundColor: `${color}15`,
        border: `2px solid ${color}`,
        boxShadow: `0 4px 20px ${color}30`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: color }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">{name}</h3>
          <span className="text-slate-400 text-[10px]">Глава {firstAppearance}</span>
        </div>
      </div>

      <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{description}</p>

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5" style={{ backgroundColor: color }} />
    </div>
  );
}
