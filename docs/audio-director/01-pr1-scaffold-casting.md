# PR 1 — Каркас Audio Director + Кастинг персонажей

## Цель

Пользователь после загрузки FB2 может перейти на новый экран Audio Director, увидеть автоматически вытащенных персонажей и назначить каждому голос + стиль. Все настройки сохраняются в IndexedDB.

## User flow в этом PR

1. Пользователь открывает книгу (`/map/:bookId` или `/books`).
2. В шапке/на странице видит новую кнопку «Озвучить» / «Audio Director».
3. Переходит на `/audio/:bookId`.
4. Если кастинг ещё не сохранён, видит кнопку «Найти персонажей» → жмёт → крутится спиннер ~10–30 с → таблица заполняется.
5. Видит:
   - Системную строку «Рассказчик» с дефолтным голосом
   - Список персонажей с дефолтными голосами и описанием
6. Для каждой строки может:
   - Поменять голос через дропдаун (с метаданными — gender, tone)
   - Отредактировать стиль (text-area) — например, «спокойный пожилой мужчина с лёгким хрипотцой»
7. Изменения сохраняются автоматически (debounce ~500 мс) в IndexedDB.

## Что НЕ делаем в этом PR

- Превью голоса (TTS-кнопка Play) — отложено по запросу пользователя.
- Любые операции с главами / разметкой — это PR 2.
- Любые операции с генерацией / плеером — это PR 3.
- Удаление / добавление персонажа вручную — для MVP только результат экстрактора, ручное добавление в PR 2 (можно дополнительной кнопкой).

## Создаваемые файлы

```
src/
├── types/
│   └── audio.ts                          # NEW: VoiceSlot, CharacterCasting, BookCasting
├── lib/
│   ├── voicePresets.ts                   # NEW: каталог 30 голосов + suggestVoice()
│   ├── geminiClient.ts                   # NEW: тонкая обёртка над @google/genai (LLM)
│   ├── audioPrompts.ts                   # NEW: extractCharactersPrompt(...)
│   └── audioDirector.ts                  # NEW: extractCharacters(book) — high-level
├── store/
│   └── audioStore.ts                     # NEW: zustand store фичи
└── components/
    └── AudioDirector/
        ├── AudioDirectorPage.tsx         # NEW: страница /audio/:bookId
        ├── CastingTable.tsx              # NEW: таблица персонаж → голос → стиль
        ├── CastingRow.tsx                # NEW: одна строка кастинга
        ├── VoicePicker.tsx               # NEW: дропдаун голосов с фильтром по полу
        └── ExtractCharactersButton.tsx   # NEW: кнопка запуска экстракта
```

## Изменяемые файлы

- `src/App.tsx` — добавить `<Route path="/audio/:bookId" .../>`.
- `src/lib/db.ts` — поднять `DB_VERSION` до `2`, добавить store `castings` и `parsedBooks`. Добавить функции `saveCasting`, `getCasting`, `saveParsedBook`, `getParsedBook`.
- `src/components/Settings/SettingsModal.tsx` — добавить поле `Gemini API ключ` (рядом с OpenRouter).
- `src/components/BookList/BookList.tsx` — добавить кнопку «Озвучить» в карточке книги (ведёт на `/audio/:bookId`).
- `src/components/Upload/UploadPage.tsx` — после успешного парсинга FB2 сохранять `parsedBook` в IndexedDB (нужно для последующей разметки глав в PR 2 и для извлечения персонажей в PR 1 без повторного парсинга).
- `package.json` — добавить `"@google/genai"` в dependencies.
- `.env.example` — добавить `VITE_GEMINI_API_KEY=...`.
- `README.md` — короткая секция «AI Audio-Director» со ссылкой на `docs/audio-director/`.

## Контракты ключевых функций

```ts
// lib/geminiClient.ts
export interface GeminiConfig {
  apiKey: string;
  proModel: string;            // 'gemini-3.1-pro-preview'
  flashModel: string;          // 'gemini-3.1-flash-lite-preview'
  ttsModel: string;            // 'gemini-3.1-flash-tts-preview'
}

export function getGeminiConfig(): GeminiConfig;
export function setGeminiApiKey(key: string): void;
export function isGeminiConfigured(): boolean;
export async function callGeminiJson<T>(model: string, prompt: string): Promise<T>;
```

```ts
// lib/audioDirector.ts (PR 1 scope)
export async function extractCharacters(
  book: ParsedFB2,
  onProgress?: (msg: string) => void,
): Promise<{
  characters: Array<{
    name: string;
    description: string;
    isMain: boolean;
    suggestedGender: 'male' | 'female' | 'neutral';
    suggestedTone: string;
  }>;
}>;

export function buildDefaultCasting(
  bookId: string,
  extracted: { characters: ExtractedCharacter[] },
): BookCasting;
```

```ts
// lib/voicePresets.ts
export interface Voice {
  id: string;          // 'Kore'
  gender: 'male' | 'female';
  style: string;       // 'Bright', 'Firm', ...
  pitch: 'lower' | 'lower-middle' | 'middle' | 'higher';
  description: string;
  recommendedFor?: string[];   // ['narrator', 'main', 'elderly']
}

export const VOICES: Voice[];
export const NARRATOR_DEFAULT_MALE = 'Charon';
export const NARRATOR_DEFAULT_FEMALE = 'Sulafat';
export function suggestVoice(opts: {gender?: string; tone?: string}): string;
```

## IndexedDB-схема (после PR 1)

```
DB: bookmap
DB_VERSION: 2

stores:
  books            (existing)  keyPath: id
  analysis         (existing)  keyPath: bookId
  parsedBooks      (NEW)       keyPath: bookId   value: ParsedFB2 + bookId
  castings         (NEW)       keyPath: bookId   value: BookCasting
```

Миграция в `db.ts::onupgradeneeded`:
```ts
if (event.oldVersion < 2) {
  if (!db.objectStoreNames.contains('parsedBooks')) {
    db.createObjectStore('parsedBooks', { keyPath: 'bookId' });
  }
  if (!db.objectStoreNames.contains('castings')) {
    db.createObjectStore('castings', { keyPath: 'bookId' });
  }
}
```

## Acceptance criteria

- [ ] Запускается `npm run dev` без ошибок, главная страница работает как раньше
- [ ] Без ключа Gemini → на `/audio/:bookId` отображается баннер «Добавьте Gemini API key в Settings»
- [ ] С ключом + новой книгой:
  - кнопка «Найти персонажей» вызывает Gemini, показывает прогресс
  - таблица заполняется списком персонажей + системной строкой «Рассказчик»
  - дефолтный голос подбирается по `suggestedGender`/`suggestedTone`
- [ ] Можно поменять голос — изменение сохраняется в IndexedDB
- [ ] Можно ввести стиль — изменение сохраняется в IndexedDB
- [ ] Перезагрузка страницы → кастинг восстанавливается из IndexedDB
- [ ] `npm run lint` и `npm run build` проходят без ошибок
- [ ] CI зелёный (если настроен)

## Артефакты для PR 2

После мержа PR 1 в репо:
- `lib/audioDirector.ts::extractCharacters` — рабочая
- `voicePresets.ts` — готов
- IndexedDB store `parsedBooks` — заполняется при загрузке FB2
- `BookCasting` — сохраняется per-book
- В `audioStore` есть `currentCasting`, `setCasting`, `extractCharacters` actions

PR 2 должен:
- Добавить в `audioDirector.ts` функцию `markupChapter(chapter, knownCharacters): Promise<ScriptBlock[]>`.
- Использовать `parsedBooks` из IndexedDB для получения текста главы (без повторного парсинга FB2).
- Использовать `currentCasting.characters[].name` как `knownCharacters` для разметки.

## Open questions

1. **Кеширование экстракта.** В PR 1 — пока не кешируем. Каждый клик «Найти персонажей» = повторный вызов LLM. Кешировать результат 3.1-pro в IndexedDB, чтобы не платить дважды? — Вопрос для PR 2.
2. **Имена персонажей в разных формах.** Например, Lev/Leo, Анна/Анечка/Аня. В PR 1 не разруливаем — модель сама решит, под каким именем вернуть. В PR 2 при разметке главы это может стать проблемой.
3. **Языки.** Промпт по умолчанию русский. Если книга на английском — результат будет с русскими описаниями. Минор для MVP.

## Риски и заметки агенту

- **Билинг Gemini Pro:** на момент написания PR free-tier квота на `gemini-3.1-pro-preview` = 0. По умолчанию в `geminiClient.ts` proModel должен быть переключаемым через настройку, чтобы пользователь без билинга мог переключиться на `gemini-3-flash-preview` без правки кода.
- **localStorage shared с другими разделами book-map.** Не используй ключ `openrouter_api_key` для Gemini — отдельный ключ `gemini_api_key`.
- **Рендеринг таблицы.** При 12 персонажах × дропдаун 30 голосов → 360 опций. Не рендерить все воиса в DOM при первом монтировании; использовать `<select>` или ленивый рендер.
- **Отмена in-flight запросов.** Если пользователь уходит со страницы во время `extractCharacters`, нужно дёргать `AbortController`. Реализовать с самого начала.
