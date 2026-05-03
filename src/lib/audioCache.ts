import { getAudioCacheEntry, putAudioCacheEntry } from './db';
import { pcmDurationMs } from './wavAssembler';
import type { ScriptBlock } from '../types/script';

const CACHE_VERSION = 'v1';

export async function makeCacheKey(
  text: string,
  voiceId: string,
  styleHint: string,
  audioTag?: string,
): Promise<string> {
  const data = JSON.stringify({
    v: CACHE_VERSION,
    text: text.trim(),
    voiceId,
    styleHint: (styleHint || '').trim(),
    audioTag: (audioTag || '').trim(),
  });

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(data);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return `${CACHE_VERSION}_${hexEncode(hash).slice(0, 32)}`;
  }
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = (h << 5) - h + data.charCodeAt(i);
    h |= 0;
  }
  return `${CACHE_VERSION}_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

function hexEncode(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < view.length; i++) {
    s += view[i].toString(16).padStart(2, '0');
  }
  return s;
}

export async function getCachedPcm(
  cacheKey: string,
): Promise<{ pcm: ArrayBuffer; durationMs: number } | null> {
  const entry = await getAudioCacheEntry(cacheKey);
  if (!entry) return null;
  return { pcm: entry.pcmBytes, durationMs: entry.durationMs };
}

export async function putCachedPcm(
  cacheKey: string,
  voiceId: string,
  text: string,
  pcm: ArrayBuffer,
): Promise<number> {
  const durationMs = pcmDurationMs(pcm);
  await putAudioCacheEntry({
    cacheKey,
    pcmBytes: pcm,
    durationMs,
    voiceId,
    text,
    createdAt: new Date().toISOString(),
  });
  return durationMs;
}

export interface BlockCacheKeyContext {
  voiceId: string;
  styleHint: string;
}

export async function cacheKeyForBlock(
  block: ScriptBlock,
  ctx: BlockCacheKeyContext,
): Promise<string> {
  return makeCacheKey(block.text, ctx.voiceId, ctx.styleHint, block.audioTag);
}
