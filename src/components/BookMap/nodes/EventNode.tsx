import { Handle, Position, type NodeProps } from '@xyflow/react';

interface EventData {
  title: string;
  description: string;
  eventType: string;
  [key: string]: unknown;
}

const EVENT_TYPE_STYLES: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  plot: { bg: 'bg-slate-700', border: 'border-slate-500', badge: 'bg-slate-500', label: 'Событие' },
  character_intro: { bg: 'bg-emerald-900/50', border: 'border-emerald-500', badge: 'bg-emerald-500', label: 'Появление' },
  character_change: { bg: 'bg-amber-900/50', border: 'border-amber-500', badge: 'bg-amber-500', label: 'Изменение' },
  climax: { bg: 'bg-red-900/50', border: 'border-red-500', badge: 'bg-red-500', label: 'Кульминация' },
  resolution: { bg: 'bg-blue-900/50', border: 'border-blue-500', badge: 'bg-blue-500', label: 'Развязка' },
};

export function EventNode({ data }: NodeProps) {
  const { title, description, eventType } = data as unknown as EventData;
  const styles = EVENT_TYPE_STYLES[eventType] || EVENT_TYPE_STYLES.plot;

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-lg px-4 py-3 shadow-md min-w-[260px] max-w-[280px]`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2.5 !h-2.5" />

      <div className="flex items-center gap-2 mb-1">
        <span className={`${styles.badge} text-white text-[10px] font-semibold px-1.5 py-0.5 rounded`}>
          {styles.label}
        </span>
        <h4 className="text-white font-semibold text-xs truncate">{title}</h4>
      </div>

      <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">{description}</p>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2.5 !h-2.5" />
      <Handle
        type="source"
        position={Position.Right}
        id="changes"
        className="!bg-purple-500 !w-2.5 !h-2.5"
      />
    </div>
  );
}
