import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ChapterData {
  title: string;
  summary: string | null;
  order: number;
  [key: string]: unknown;
}

export function ChapterNode({ data }: NodeProps) {
  const { title, summary, order } = data as unknown as ChapterData;

  return (
    <div className="bg-slate-800 border-2 border-indigo-500 rounded-xl px-5 py-4 shadow-lg shadow-indigo-500/20 min-w-[280px] max-w-[320px]">
      <Handle type="target" position={Position.Left} className="!bg-indigo-500 !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-2">
        <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {order}
        </span>
        <h3 className="text-white font-bold text-sm truncate">{title}</h3>
      </div>

      {summary && (
        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{summary}</p>
      )}

      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-3 !h-3" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="events"
        className="!bg-amber-500 !w-3 !h-3"
      />
    </div>
  );
}
