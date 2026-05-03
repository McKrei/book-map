import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey, GEMINI_TTS_MODEL } from './geminiClient';
import { base64ToArrayBuffer } from './wavAssembler';

let cachedClient: { key: string; client: GoogleGenAI } | null = null;

function getClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API ключ не настроен');
  }
  if (!cachedClient || cachedClient.key !== apiKey) {
    cachedClient = { key: apiKey, client: new GoogleGenAI({ apiKey }) };
  }
  return cachedClient.client;
}

export interface GeminiTTSOptions {
  text: string;
  voiceId: string;
  styleHint?: string;
  audioTag?: string;
  signal?: AbortSignal;
  model?: string;
}

function buildPromptText(opts: GeminiTTSOptions): string {
  const parts: string[] = [];
  if (opts.styleHint && opts.styleHint.trim()) {
    parts.push(`Озвучь с характером: ${opts.styleHint.trim()}.`);
  }
  if (opts.audioTag && opts.audioTag.trim()) {
    parts.push(opts.audioTag.trim());
  }
  parts.push(opts.text.trim());
  return parts.join(' ');
}

export async function callGeminiTTS(opts: GeminiTTSOptions): Promise<ArrayBuffer> {
  if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const client = getClient();
  const model = opts.model || GEMINI_TTS_MODEL;
  const promptText = buildPromptText(opts);

  const response = await client.models.generateContent({
    model,
    contents: promptText,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: opts.voiceId },
        },
      },
    },
  });

  if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const inline = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data) {
    throw new Error('Gemini TTS не вернул аудио данные');
  }
  return base64ToArrayBuffer(inline.data);
}
