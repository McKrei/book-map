import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export interface PipelineStage {
  id: string;
  icon: ReactNode;
  label: string;
  matches: (msg: string) => boolean;
}

interface Props {
  stages: PipelineStage[];
  message: string;
  error?: string | null;
}

function findActive(stages: PipelineStage[], message: string): number {
  const m = (message || '').toLowerCase();
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].matches(m)) return i;
  }
  return 0;
}

export function AnalysisPipeline({ stages, message, error }: Props) {
  const activeIdx = error ? -1 : findActive(stages, message);

  return (
    <div
      className="neon-border rounded-2xl p-5"
      style={{
        background: 'var(--bg-card)',
        boxShadow: 'var(--glow-purple)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: error ? '#ef4444' : 'var(--neon-cyan)',
              boxShadow: error ? '0 0 10px #ef4444' : '0 0 10px var(--neon-cyan)',
            }}
          />
          {!error && (
            <div
              className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
              style={{ background: 'var(--neon-cyan)', opacity: 0.5 }}
            />
          )}
        </div>
        <div className="flex-1">
          <p
            className="text-[13px] font-medium"
            style={{ color: error ? '#ef4444' : 'var(--text-primary)' }}
          >
            {error || message || 'Подготовка...'}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {stages.map((s, i) => {
          const status: 'done' | 'active' | 'pending' =
            i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
          return (
            <div key={s.id} className="flex items-center gap-3 transition-all duration-300">
              <div
                className="relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                style={{
                  background:
                    status === 'done'
                      ? 'rgba(52, 211, 153, 0.15)'
                      : status === 'active'
                        ? 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))'
                        : 'var(--bg-secondary)',
                  color:
                    status === 'done'
                      ? 'var(--neon-green)'
                      : status === 'active'
                        ? '#fff'
                        : 'var(--text-muted)',
                  boxShadow: status === 'active' ? 'var(--glow-purple)' : 'none',
                  opacity: status === 'pending' ? 0.5 : 1,
                }}
              >
                {status === 'done' ? <Check size={14} /> : s.icon}
                {status === 'active' && (
                  <div
                    className="absolute inset-0 rounded-lg animate-pulse"
                    style={{
                      background: 'rgba(167, 139, 250, 0.15)',
                    }}
                  />
                )}
              </div>
              <div
                className="text-[13px] flex-1 transition-colors duration-300"
                style={{
                  color:
                    status === 'done'
                      ? 'var(--text-secondary)'
                      : status === 'active'
                        ? 'var(--text-primary)'
                        : 'var(--text-muted)',
                  fontWeight: status === 'active' ? 600 : 400,
                  opacity: status === 'pending' ? 0.6 : 1,
                }}
              >
                {s.label}
              </div>
              {status === 'active' && (
                <div className="flex items-center gap-1">
                  <span
                    className="w-1 h-1 rounded-full animate-bounce"
                    style={{
                      background: 'var(--neon-cyan)',
                      animationDelay: '0ms',
                    }}
                  />
                  <span
                    className="w-1 h-1 rounded-full animate-bounce"
                    style={{
                      background: 'var(--neon-cyan)',
                      animationDelay: '150ms',
                    }}
                  />
                  <span
                    className="w-1 h-1 rounded-full animate-bounce"
                    style={{
                      background: 'var(--neon-cyan)',
                      animationDelay: '300ms',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
