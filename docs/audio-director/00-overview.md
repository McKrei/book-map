# 00. Архитектурный обзор

## User flow (как у пользователя в финале)

1. Пользователь загружает FB2 → попадает на карту книги (как сейчас в book-map).
2. На странице книги жмёт кнопку «Озвучить» → переходит на новый экран **Audio Director** (`/audio/:bookId`).
3. На экране **Casting** видит список персонажей (вытащенных из текста LLM-ом) + системный слот «Рассказчик». Для каждого выбирает:
   - **голос** (из 30 prebuilt) — дропдаун с метаданными (gender, тон, описание)
   - **акцент / стиль / характер** — текстовое поле + готовые пресеты (audio-tag-стиль)
4. Сохраняет кастинг → переходит к выбору главы.
5. Видит сайдбар глав → кликает главу → попадает на **Chapter Editor** (`/audio/:bookId/chapter/:chapterId`).
6. Жмёт «Разметить» → LLM возвращает массив `ScriptBlock[]` → блоки рендерятся цветными карточками по спикерам.
7. Правит, что не так (спикер, эмоция, текст), при необходимости меняет глобальный кастинг (тогда все главы перенаследуют новые голоса).
8. Жмёт «Сгенерировать» → очередь TTS-вызовов с прогрессом → склейка → плеер + скачивание `.wav`.

## Маппинг на эпики PRD

| Эпик PRD | PR | Где живёт |
|---|---|---|
| 1.1 Загрузка FB2 | — | Уже есть в `UploadPage.tsx` |
| 1.2 Парсер FB2 | — | Уже есть в `lib/fb2Parser.ts` |
| 1.3 Хранение | PR 1 | Расширим `lib/db.ts` (новый store `parsedBooks`) |
| 2.1 Экстрактор персонажей | PR 1 | `lib/audioDirector.ts::extractCharacters()` через 3.1-pro |
| 2.2 Менеджер голосов | PR 1 | `lib/voicePresets.ts` (каталог 30 голосов) |
| 2.3 UI Кастинга | PR 1 | `components/AudioDirector/CastingTable.tsx` |
| 3.1 Навигация по главам | PR 2 | `components/AudioDirector/ChapterList.tsx` |
| 3.2 Семантическая разметка | PR 2 | `lib/audioDirector.ts::markupChapter()` через 3.1-flash-lite |
| 3.3 UI Скрипт-редактора | PR 2 | `components/AudioDirector/ScriptEditor.tsx` |
| 3.4 Инструменты редактирования | PR 2 | Inline-edit в ScriptBlock |
| 4.1 Очередь генерации | PR 3 | `lib/ttsQueue.ts` |
| 4.2 UI прогресса | PR 3 | `components/AudioDirector/GenerationProgress.tsx` |
| 4.3 Склейка и экспорт | PR 3 | `lib/audioAssembly.ts` |
| 4.4 Плеер и скачивание | PR 3 | `components/AudioDirector/ChapterAudioPlayer.tsx` |

## Структура данных (IndexedDB)

Дополнительные object stores в существующей БД `bookmap` (поднимаем `DB_VERSION`):

- `parsedBooks` (key: `bookId`) — `{bookId, title, author, chapters: [{order, title, text}]}`. Сохраняется после первой загрузки FB2 (нужен для разметки глав без повторного парсинга).
- `castings` (key: `bookId`) — `{bookId, narratorVoice: VoiceSlot, characters: CharacterCasting[]}`.
- `chapterScripts` (key: `chapterId`) — `{bookId, chapterId, blocks: ScriptBlock[], updatedAt}`. Появляется в PR 2.
- `audioBlocks` (key: hash) — `{hash, blob, mimeType, durationSec, generatedAt}`. Появляется в PR 3.
- `chapterAudio` (key: `chapterId`) — `{chapterId, blob, generatedAt}`. Финальная склейка из PR 3.

## Структура данных (TypeScript)

```ts
// types/audio.ts (PR 1)
export interface VoiceSlot {
  voiceId: string;          // 'Kore', 'Charon', ... — id из voicePresets
  styleHint: string;        // user-editable стиль / характер / акцент
}

export interface CharacterCasting {
  name: string;             // имя персонажа из LLM-экстракта
  description?: string;     // короткое описание (для контекста)
  voice: VoiceSlot;
  isMain: boolean;          // основной/второстепенный
}

export interface BookCasting {
  bookId: string;
  narrator: VoiceSlot;      // системный слот «Рассказчик» — обязательно
  characters: CharacterCasting[];
  updatedAt: string;
}

// types/audio.ts (PR 2)
export interface ScriptBlock {
  id: string;
  chapterId: string;
  order: number;
  speaker: string;          // 'Narrator' (системный ключ) или имя из CharacterCasting.name
  emotion: string | null;   // короткий ярлык, конвертируем в audio tag при TTS
  text: string;
  status: 'pending' | 'generating' | 'ready' | 'error';
  audioBlockHash: string | null;
  durationSec: number | null;
  error?: string;
}
```

## Вызовы Gemini — общие правила

- Один тонкий клиент `lib/geminiClient.ts`, поверх него — high-level функции в `lib/audioDirector.ts`.
- API-ключ: `localStorage['gemini_api_key']` или `import.meta.env.VITE_GEMINI_API_KEY`.
- Все JSON-вызовы — с `responseMimeType: 'application/json'` для строгой структуры.
- Для большой книги (>~200 KB текста на вход 3.1-pro): сначала summarize main characters по фрагментам начала + конца книги, потом мерджим. Для MVP PR 1 достаточно отправить **первые 30 000 символов** (≈ 10K токенов) — типичная книга в этот лимит укладывается, окно у 3.1-pro гораздо больше.

## Out of scope для всех 3 PR

- Авторизация / multi-user / sharing — только локальный single-user
- Облачное хранение аудио (полагаемся на IndexedDB; экспорт через download)
- Управление API-ключом без UI (например, через OAuth)
- Авто-обнаружение языка / non-RU/EN
- Embedding-based кеш по «похожести» текста — только хеш-кеш
- Voice cloning / custom voices — только prebuilt 30
- Live API streaming
- Тарификация / лимиты на стороне фронта
