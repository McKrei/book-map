import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY_STORAGE = 'gemini_api_key';
const GEMINI_PRO_MODEL_STORAGE = 'gemini_pro_model';
const GEMINI_FLASH_MODEL_STORAGE = 'gemini_flash_model';

export const GEMINI_PRO_MODEL_DEFAULT = 'gemini-3.1-pro-preview';
export const GEMINI_FLASH_MODEL_DEFAULT = 'gemini-3.1-flash-lite-preview';
export const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';

export const GEMINI_PRO_FALLBACKS = [
  'gemini-3.1-pro-preview',
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
];

export const GEMINI_FLASH_FALLBACKS = [
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
];

export interface GeminiConfig {
  apiKey: string;
  proModel: string;
  flashModel: string;
  ttsModel: string;
}

export function getGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem(GEMINI_API_KEY_STORAGE) ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ''
  );
}

export function setGeminiApiKey(key: string): void {
  window.localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export function getProModel(): string {
  return window.localStorage.getItem(GEMINI_PRO_MODEL_STORAGE) || GEMINI_PRO_MODEL_DEFAULT;
}

export function setProModel(model: string): void {
  window.localStorage.setItem(GEMINI_PRO_MODEL_STORAGE, model);
}

export function getFlashModel(): string {
  return window.localStorage.getItem(GEMINI_FLASH_MODEL_STORAGE) || GEMINI_FLASH_MODEL_DEFAULT;
}

export function setFlashModel(model: string): void {
  window.localStorage.setItem(GEMINI_FLASH_MODEL_STORAGE, model);
}

export function getGeminiConfig(): GeminiConfig {
  return {
    apiKey: getGeminiApiKey(),
    proModel: getProModel(),
    flashModel: getFlashModel(),
    ttsModel: GEMINI_TTS_MODEL,
  };
}

let cachedClient: { key: string; client: GoogleGenAI } | null = null;

function getClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'Gemini API ключ не настроен. Откройте Settings и добавьте ключ Google AI Studio.',
    );
  }
  if (!cachedClient || cachedClient.key !== apiKey) {
    cachedClient = { key: apiKey, client: new GoogleGenAI({ apiKey }) };
  }
  return cachedClient.client;
}

export interface JsonCallOptions {
  temperature?: number;
  signal?: AbortSignal;
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Пустой ответ от Gemini');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  throw new Error('Не удалось извлечь JSON из ответа Gemini');
}

export async function callGeminiJson<T>(
  model: string,
  prompt: string,
  options: JsonCallOptions = {},
): Promise<T> {
  const client = getClient();
  const { temperature = 0.2, signal } = options;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature,
    },
  });

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = extractJsonText(text);
  return JSON.parse(cleaned) as T;
}

export function isGeminiQuotaError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg);
}

export function isGeminiAuthError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return /\b401\b|\b403\b|API key|unauthorized|invalid.?key/i.test(msg);
}
