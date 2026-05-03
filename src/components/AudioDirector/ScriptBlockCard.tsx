import { useState } from 'react';
import { Trash2, Edit3, Check, X, ChevronDown } from 'lucide-react';
import type { ScriptBlock } from '../../types/script';
import type { BookCasting } from '../../types/audio';
import { NARRATOR_SPEAKER } from '../../types/script';
import { getSpeakerVisual, type SpeakerVisual } from './speakerColors';

interface Props {
  block: ScriptBlock;
  visuals: Record<string, SpeakerVisual>;
  casting: BookCasting | null;
  onChangeSpeaker: (speaker: string) => void;
  onChangeText: (text: string) => void;
  onChangeEmotion: (emotion: string) => void;
  onRemove: () => void;
}

export function ScriptBlockCard({
  block,
  visuals,
  casting,
  onChangeSpeaker,
  onChangeText,
  onChangeEmotion,
  onRemove,
}: Props) {
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState(block.text);
  const [prevText, setPrevText] = useState(block.text);
  const [draftEmotion, setDraftEmotion] = useState(block.emotion || '');
  const [prevEmotion, setPrevEmotion] = useState(block.emotion || '');
  const [speakerOpen, setSpeakerOpen] = useState(false);

  if (block.text !== prevText) {
    setPrevText(block.text);
    setDraftText(block.text);
  }
  const emotionValue = block.emotion || '';
  if (emotionValue !== prevEmotion) {
    setPrevEmotion(emotionValue);
    setDraftEmotion(emotionValue);
  }

  const visual = getSpeakerVisual(visuals, block.speaker);
  const allSpeakers = [
    NARRATOR_SPEAKER,
    ...((casting?.characters ?? []).map((c) => c.name)),
  ];

  return (
    <div
      className="rounded-2xl p-3 transition-colors duration-200"
      style={{
        background: visual.background,
        border: `1px solid ${visual.border}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setSpeakerOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-2.5 py-1"
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              color: visual.color,
              border: `1px solid ${visual.border}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: visual.color, boxShadow: `0 0 6px ${visual.color}` }}
            />
            {visual.label}
            <ChevronDown size={12} />
          </button>
          {speakerOpen && (
            <div
              className="absolute z-10 mt-1 left-0 rounded-xl py-1.5 max-h-72 overflow-y-auto"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
                minWidth: 180,
              }}
            >
              {allSpeakers.map((s) => {
                const v = getSpeakerVisual(visuals, s);
                const active = s === block.speaker;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      onChangeSpeaker(s);
                      setSpeakerOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 hover:bg-white/5"
                    style={{
                      color: active ? v.color : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: v.color }}
                    />
                    {v.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <input
          type="text"
          value={draftEmotion}
          placeholder="emotion"
          onChange={(e) => setDraftEmotion(e.target.value)}
          onBlur={() => {
            if (draftEmotion !== (block.emotion || '')) onChangeEmotion(draftEmotion);
          }}
          className="text-[12px] rounded-md px-2 py-1 outline-none"
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            width: 130,
          }}
        />

        {block.audioTag && (
          <span
            className="text-[11px] rounded-md px-1.5 py-0.5 font-mono"
            style={{
              background: 'rgba(34, 211, 238, 0.1)',
              color: 'var(--neon-cyan)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
            }}
          >
            {block.audioTag}
          </span>
        )}

        <div className="flex-1" />

        <StatusBadge status={block.audioStatus} />

        {!editingText ? (
          <button
            onClick={() => setEditingText(true)}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            title="Редактировать текст"
            style={{ color: 'var(--text-muted)' }}
          >
            <Edit3 size={14} />
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                onChangeText(draftText);
                setEditingText(false);
              }}
              className="p-1.5 rounded-md hover:bg-emerald-500/15 transition-colors"
              title="Сохранить"
              style={{ color: 'var(--neon-green)' }}
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setDraftText(block.text);
                setEditingText(false);
              }}
              className="p-1.5 rounded-md hover:bg-red-500/15 transition-colors"
              title="Отменить"
              style={{ color: '#f87171' }}
            >
              <X size={14} />
            </button>
          </>
        )}

        <button
          onClick={onRemove}
          className="p-1.5 rounded-md hover:bg-red-500/15 transition-colors"
          title="Удалить блок"
          style={{ color: '#f87171' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {!editingText ? (
        <p
          className="text-[14px] leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-primary)' }}
        >
          {block.text}
        </p>
      ) : (
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={Math.min(8, Math.max(2, Math.ceil(draftText.length / 80)))}
          className="w-full rounded-lg p-2 text-[14px] leading-relaxed outline-none resize-y"
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      )}

      {block.errorMessage && (
        <p className="text-[12px] mt-1.5" style={{ color: '#f87171' }}>
          {block.errorMessage}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ScriptBlock['audioStatus'] }) {
  if (status === 'pending') return null;
  const styles: Record<
    Exclude<ScriptBlock['audioStatus'], 'pending'>,
    { bg: string; color: string; label: string }
  > = {
    generating: {
      bg: 'rgba(34, 211, 238, 0.12)',
      color: 'var(--neon-cyan)',
      label: '⌛ генерация',
    },
    done: {
      bg: 'rgba(52, 211, 153, 0.1)',
      color: 'var(--neon-green)',
      label: '✓ озвучен',
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.12)',
      color: '#f87171',
      label: '⚠ ошибка',
    },
  };
  const s = styles[status];
  return (
    <span
      className="text-[11px] rounded-full px-2 py-0.5"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}


