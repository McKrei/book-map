import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { User } from 'lucide-react';

interface CharacterData {
  name: string;
  description: string;
  color: string;
  firstAppearance: number;
  [key: string]: unknown;
}

export function CharacterNode({ data }: NodeProps) {
  const { name, description, color, firstAppearance } = data as unknown as CharacterData;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl px-5 py-4 min-w-[240px] max-w-[270px] transition-all duration-300 cursor-pointer"
      style={{
        background: 'var(--bg-card)',
        border: `1.5px solid ${color}60`,
        boxShadow: `0 0 24px ${color}20, 0 4px 16px rgba(0,0,0,0.15)`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
            boxShadow: `0 0 16px ${color}40`,
          }}
        >
          <User size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h3
            className="font-semibold text-[13px] leading-tight truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {name}
          </h3>
          <span
            className="text-[10px] font-medium"
            style={{ color: color }}
          >
            С главы {firstAppearance}
          </span>
        </div>
      </div>

      <p
        className={`text-[12px] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {description}
      </p>
      {description.length > 80 && (
        <button
          className="text-[10px] mt-1.5 font-medium hover:underline"
          style={{ color: 'var(--neon-purple)' }}
        >
          {expanded ? 'Свернуть' : 'Подробнее...'}
        </button>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !rounded-full"
        style={{ backgroundColor: color, border: `2px solid ${color}`, boxShadow: `0 0 8px ${color}60` }}
      />
    </div>
  );
}
