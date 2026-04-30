import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { Zap, UserPlus, RefreshCw, Flame, Flag, TrendingUp, Skull, Lightbulb, Heart } from 'lucide-react';

interface CharacterChangeInfo {
  characterName: string;
  changeDescription: string;
  changeType: string;
  color: string;
}

interface EventData {
  title: string;
  description: string;
  eventType: string;
  characterChanges: CharacterChangeInfo[];
  [key: string]: unknown;
}

const EVENT_CONFIG: Record<string, { color: string; icon: typeof Zap; label: string }> = {
  plot:             { color: '#60a5fa', icon: Zap,       label: 'Событие' },
  character_intro:  { color: '#34d399', icon: UserPlus,  label: 'Появление' },
  character_change: { color: '#fbbf24', icon: RefreshCw, label: 'Изменение' },
  climax:           { color: '#f87171', icon: Flame,     label: 'Кульминация' },
  resolution:       { color: '#a78bfa', icon: Flag,      label: 'Развязка' },
};

const CHANGE_ICONS: Record<string, typeof TrendingUp> = {
  development: TrendingUp,
  death: Skull,
  transformation: RefreshCw,
  revelation: Lightbulb,
  relationship: Heart,
};

export function EventNode({ data }: NodeProps) {
  const { title, description, eventType, characterChanges } = data as unknown as EventData;
  const config = EVENT_CONFIG[eventType] || EVENT_CONFIG.plot;
  const [expanded, setExpanded] = useState(false);
  const changes = characterChanges || [];
  const IconComponent = config.icon;

  return (
    <div
      className="rounded-2xl w-[340px] transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${config.color}30`,
        boxShadow: `0 0 20px ${config.color}08, 0 2px 12px rgba(0,0,0,0.1)`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !rounded-full"
        style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}40` }}
      />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${config.color}18` }}
          >
            <IconComponent size={13} style={{ color: config.color }} />
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${config.color}15`, color: config.color }}
          >
            {config.label}
          </span>
        </div>
        <h4
          className="font-semibold text-[13px] mb-1.5 leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h4>

        <p
          className={`text-[12px] leading-relaxed cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => setExpanded(!expanded)}
        >
          {description}
        </p>
        {description.length > 80 && (
          <button
            className="text-[10px] mt-1 font-medium hover:underline"
            style={{ color: 'var(--neon-purple)' }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Свернуть' : 'Подробнее...'}
          </button>
        )}
      </div>

      {changes.length > 0 && (
        <div
          className="px-4 py-2.5 space-y-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {changes.map((change, idx) => {
            const ChangeIcon = CHANGE_ICONS[change.changeType] || Zap;
            return (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-[11px] rounded-xl px-2.5 py-2"
                style={{ backgroundColor: `${change.color}08` }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${change.color}15` }}
                >
                  <ChangeIcon size={11} style={{ color: change.color }} />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-[11px]" style={{ color: change.color }}>
                    {change.characterName}
                  </span>
                  <p
                    className="text-[10px] leading-relaxed mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {change.changeDescription}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !rounded-full"
        style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}40` }}
      />
    </div>
  );
}
