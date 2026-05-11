# PR 2 — Сайдбар глав + LLM-разметка + Скрипт-редактор

## Цель

Пользователь, имея кастинг из PR 1, выбирает главу, ИИ размечает её на блоки реплик, пользователь визуально проверяет и правит разметку. Готовая разметка сохраняется в IndexedDB и готова к генерации в PR 3.

## User flow в этом PR

1. Пользователь на `/audio/:bookId` справа в сайдбаре видит список глав.
2. Кликает главу → переходит на `/audio/:bookId/chapter/:chapterId`.
3. Видит экран с двумя колонками:
   - Слева — список глав (всё ещё)
   - В центре — большой скрипт-редактор:
     - Если разметки ещё нет → кнопка «Разметить главу»
     - Если есть → массив цветных карточек блоков
4. Каждый блок:
   - Цвет = по спикеру (voice → color)
   - Заголовок: имя спикера + (опц.) эмоция
   - Тело: текст реплики
   - Hover → панель действий: Edit speaker, Edit emotion, Edit text, Split block, Merge with next, Delete
5. Изменения автосохраняются в IndexedDB (debounce 500 мс).

## Что НЕ делаем в этом PR

- Никакой генерации аудио / TTS / плеера — это PR 3.
- Drag-and-drop reorder блоков — пока не реализуем (split + edit hardcoded в TextEditor).

## Создаваемые файлы

```
src/
├── lib/
│   └── audioDirector.ts                  # +markupChapter(chapter, characters): Promise<ScriptBlock[]>
├── components/
│   └── AudioDirector/
│       ├── ChapterEditorPage.tsx         # NEW: /audio/:bookId/chapter/:chapterId
│       ├── ChapterList.tsx               # NEW: сайдбар глав
│       ├── ScriptEditor.tsx              # NEW: список блоков
│       ├── ScriptBlockCard.tsx           # NEW: один блок (просмотр + редактирование)
│       ├── BlockSpeakerPicker.tsx        # NEW: выбор спикера (из BookCasting)
│       └── BlockEmotionPicker.tsx        # NEW: эмоция (preset + custom)
└── store/
    └── audioStore.ts                     # +chapterScript, +setBlock, +addBlock, +removeBlock, etc.
```

## Изменяемые файлы

- `src/types/audio.ts` — добавить `ScriptBlock` (определение в `00-overview.md`).
- `src/lib/db.ts` — добавить store `chapterScripts`, поднять `DB_VERSION` до `3`.
- `src/lib/audioPrompts.ts` — добавить `markupChapterPrompt(...)`.
- `src/App.tsx` — добавить роут `/audio/:bookId/chapter/:chapterId`.

## Контракты

```ts
// lib/audioDirector.ts
export async function markupChapter(
  chapter: ParsedFB2['chapters'][number],
  knownCharacterNames: string[],
  onProgress?: (msg: string) => void,
): Promise<{
  blocks: Array<{
    speaker: string;       // одно из knownCharacterNames | 'Рассказчик'
    emotion: string | null;
    text: string;
  }>;
}>;
```

При сохранении в IndexedDB каждому блоку присваивается:
- `id`: `crypto.randomUUID()`
- `chapterId`: текущая глава
- `order`: индекс в массиве
- `status`: `'pending'`
- `audioBlockHash`: `null`
- `durationSec`: `null`

## Acceptance criteria

- [ ] Сайдбар глав виден на `/audio/:bookId` и `/audio/:bookId/chapter/:chapterId`
- [ ] Кнопка «Разметить главу» вызывает `markupChapter`, показывает прогресс
- [ ] Блоки рендерятся как карточки, окрашены по спикеру (используем `voice.id` → стабильный hex)
- [ ] Можно поменять спикера блока → перекраска
- [ ] Можно отредактировать текст inline → автосохранение
- [ ] Можно поменять эмоцию (предлагается список + custom-input)
- [ ] Можно удалить блок и добавить блок «снизу»
- [ ] При перезагрузке разметка восстанавливается из IndexedDB
- [ ] Если в `BookCasting` нет персонажа из разметки (модель ошиблась) → блок помечается жёлтым предупреждением и предлагает либо поменять спикера, либо добавить персонажа в кастинг
- [ ] `npm run lint` и `npm run build` проходят
- [ ] CI зелёный

## Артефакты для PR 3

- IndexedDB store `chapterScripts` заполнен валидными `ScriptBlock[]`.
- `audioStore.ts` содержит `currentChapterBlocks`, `updateBlock(id, patch)`.

PR 3 должен:
- Прочитать `chapterScripts[chapterId]` из IndexedDB.
- Для каждого `ScriptBlock` со `status === 'pending'` или с null `audioBlockHash` — поставить в очередь TTS.
- Использовать `casting.characters[].voice` для маппинга speaker → voiceId.

## Open questions

1. **Как обрабатывать блоки без чёткого спикера** (например, длинная авторская речь): по умолчанию `'Рассказчик'`, но пользователь может вручную сменить.
2. **Lookahead для multi-speaker.** Когда два соседних блока 2-х разных спикеров — это кандидат на multi-speaker TTS-вызов (см. `prompts.md` §4). Помечать заранее или собирать на лету в PR 3?
3. **Lock редактирования при наличии аудио.** Если блок уже сгенерирован (PR 3), редактирование текста должно сбросить `audioBlockHash` и пометить блок `pending`. Этого PR 2 не делает (нет аудио ещё), но в типах учесть.

## Риски и заметки агенту

- При экстремально длинной главе (>50 KB) `flash-lite` может потерять связность. Стратегия — разрезать главу на ~10 KB чанки по абзацам, размечать каждый, склеивать. Если делать сразу сложно, сначала проверить на типичной главе.
- Цвет блока должен быть стабильным даже после переэкстракции персонажей. Хранить `color` в `BookCasting` (добавь `Voice.color` или `CharacterCasting.color`).
