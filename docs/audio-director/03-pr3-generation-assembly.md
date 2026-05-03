# PR 3 — TTS-генерация, склейка и экспорт

## Цель

Пользователь жмёт кнопку «Сгенерировать главу» → блоки уходят в очередь TTS → собираются → пользователь слушает результат и скачивает `.wav`.

## User flow в этом PR

1. На `/audio/:bookId/chapter/:chapterId` появляется кнопка «Сгенерировать аудио» (большая, под скриптом).
2. По клику запускается генерация:
   - Прогресс-бар: `X / N блоков готово`
   - Каждый блок параллельно (limit=5) уходит в TTS API
   - В каждой карточке блока появляется индикатор: `pending → generating → ready` или `error`
3. По готовности всех блоков — автоматическая склейка → плеер появляется внизу.
4. Плеер: play/pause, scrubber, кнопка «Скачать .wav».
5. Если пользователь редактирует блок после генерации (текст / спикер / эмоция) → блок снова `pending`, нужно жмякнуть «Сгенерировать», и пересоздастся **только этот блок** (остальные взяты из IndexedDB-кеша).

## Что НЕ делаем в этом PR

- Разные форматы экспорта — только `.wav`. MP3 — в follow-up.
- Авто-генерация всей книги (всех глав сразу) — только текущая глава.
- Шеринг по ссылке / облачное хранение — нет.

## Создаваемые файлы

```
src/
├── lib/
│   ├── geminiTts.ts                      # NEW: TTS-клиент (single + multi-speaker)
│   ├── audioCache.ts                     # NEW: IndexedDB-кеш блоков (hash → blob)
│   ├── audioAssembly.ts                  # NEW: склейка PCM-чанков → WAV
│   ├── ttsQueue.ts                       # NEW: семафор + retry + AbortController
│   └── audioDirector.ts                  # +generateChapter(chapterId) high-level
├── components/
│   └── AudioDirector/
│       ├── GenerationProgress.tsx        # NEW: прогресс по блокам
│       ├── BlockAudioStatus.tsx          # NEW: индикатор внутри ScriptBlockCard
│       └── ChapterAudioPlayer.tsx        # NEW: плеер + download
└── store/
    └── audioStore.ts                     # +generation state, +addProgress, +setBlockStatus
```

## Изменяемые файлы

- `src/lib/db.ts` — добавить stores `audioBlocks`, `chapterAudio`. Поднять `DB_VERSION` до `4`.
- `src/components/AudioDirector/ScriptBlockCard.tsx` — встроить `BlockAudioStatus`.
- `src/components/AudioDirector/ChapterEditorPage.tsx` — добавить `<GenerationProgress />` + `<ChapterAudioPlayer />`.

## Контракты

### `lib/geminiTts.ts`

```ts
export interface TtsRequest {
  text: string;
  voiceId: string;
  styleHint?: string;       // префикс-инструкция (см. prompts.md §3)
  emotion?: string | null;  // в audio tag
  abortSignal?: AbortSignal;
}

export interface TtsResult {
  pcm: Uint8Array;          // raw PCM 24kHz mono 16-bit
  durationSec: number;
  mimeType: string;
}

export async function ttsSingleSpeaker(req: TtsRequest): Promise<TtsResult>;

export async function ttsMultiSpeaker(req: {
  speakers: Array<{ name: string; voiceId: string }>;
  blocks: Array<{ speaker: string; text: string }>;
  styleHint?: string;
  abortSignal?: AbortSignal;
}): Promise<TtsResult>;
```

### `lib/audioCache.ts`

```ts
export function blockHash(req: TtsRequest, modelVersion: string): Promise<string>;
export async function getCachedAudio(hash: string): Promise<Blob | null>;
export async function putCachedAudio(hash: string, blob: Blob, durationSec: number): Promise<void>;
```

### `lib/ttsQueue.ts`

```ts
export interface QueueOptions {
  concurrency: number;       // default 5
  maxRetries: number;        // default 3
  abortSignal?: AbortSignal;
}

export async function runTtsBatch(
  blocks: ScriptBlock[],
  casting: BookCasting,
  onBlockProgress: (id: string, status: ScriptBlock['status'], err?: string) => void,
  opts?: QueueOptions,
): Promise<void>;
```

### `lib/audioAssembly.ts`

```ts
// Склейка PCM-чанков 24kHz mono 16-bit + опциональная тишина между блоками.
export function assemblePcm(
  blocks: Array<{ pcm: Uint8Array; gapMs?: number }>,
): Uint8Array;

export function pcmToWav(pcm: Uint8Array, opts?: {
  sampleRate?: number;     // default 24000
  channels?: number;       // default 1
  bitsPerSample?: number;  // default 16
}): Blob;
```

## Acceptance criteria

- [ ] Клик «Сгенерировать» → блоки уходят в очередь, прогресс-бар обновляется
- [ ] Параллелизм 5, retry до 3 раз с exponential backoff на 429/503
- [ ] При повторном клике после редактирования одного блока — TTS вызывается **только** для изменённого
- [ ] После генерации появляется плеер главы
- [ ] Между блоками пауза 300 мс
- [ ] Кнопка «Скачать .wav» сохраняет файл `<bookTitle>-<chapterTitle>.wav`
- [ ] Если AbortController сработал (пользователь ушёл с экрана) — все in-flight запросы отменяются, статусы блоков откатываются на `pending`
- [ ] `npm run lint` и `npm run build` проходят
- [ ] CI зелёный

## Open questions / опции

1. **Multi-speaker батчинг.** Можно прятать соседние пары блоков от 2 разных спикеров в один multi-speaker вызов. Включить ли по умолчанию или флагом? Предложение: флаг в Settings, по умолчанию OFF (single-speaker предсказуемее).
2. **Громкость нормализация.** Разные голоса дают разный уровень. RMS-нормализацию между блоками — в follow-up.
3. **Длинные блоки > 4 000 байт.** Если один `ScriptBlock.text` превышает лимит TTS API — резать на предложения, генерировать каждое отдельно, склеивать без зазора.
4. **Кросс-главский кеш.** Один и тот же текст в двух главах должен переиспользовать audio. Кеш-ключ глобальный (по hash(text+voice+style)).

## Риски

- **Стоимость:** для 30-главной книги генерация всей книги может быть дорогой. Считать оценку перед запуском (text length × tokens × price) и показывать пользователю.
- **Кварты Gemini:** в free-tier лимиты на TTS будут раньше, чем хотелось бы. Делать UX-обработку 429.
- **IndexedDB blob-store:** аудио быстро забивает диск. Добавить кнопку «Очистить кеш аудио».
