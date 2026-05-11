import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BookOpen } from 'lucide-react';

interface ChapterData {
  title: string;
  summary: string | null;
  order: number;
  containerWidth: number;
  containerHeight: number;
  [key: string]: unknown;
}

export function ChapterNode({ data }: NodeProps) {
  const { title, summary, order, containerWidth, containerHeight } = data as unknown as ChapterData;

  return (
    <div
      className="rounded-2xl overflow-visible"
      style={{
        width: containerWidth || 400,
        height: containerHeight || 500,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 0 30px rgba(99, 102, 241, 0.06)',
        opacity: 0.85,
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-3 rounded-t-2xl"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(96,165,250,0.05))',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))',
            boxShadow: 'var(--glow-purple)',
          }}
        >
          <span className="text-white text-xs font-bold">{order}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <BookOpen size={12} style={{ color: 'var(--neon-purple)' }} />
            <h3
              className="font-semibold text-[13px] truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
          </div>
          {summary && (
            <p
              className="text-[10px] leading-snug mt-0.5 line-clamp-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {summary}
            </p>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full"
        style={{
          backgroundColor: 'var(--neon-purple)',
          border: '2px solid var(--neon-purple)',
          boxShadow: 'var(--glow-purple)',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full"
        style={{
          backgroundColor: 'var(--neon-blue)',
          border: '2px solid var(--neon-blue)',
          boxShadow: 'var(--glow-blue)',
        }}
      />
    </div>
  );
}
