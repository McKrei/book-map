import type { ParsedFB2 } from '../types';
import type { BookCasting } from '../types/audio';
import type { SeriesPriorCharacter } from '../types/audio';
import { NARRATOR_SPEAKER } from '../types/script';

const MAX_GLOBAL_CHARS = 30_000;

export function buildBookSnippet(book: ParsedFB2): string {
  const parts: string[] = [];
  let used = 0;
  for (const ch of book.chapters) {
    if (used >= MAX_GLOBAL_CHARS) break;
    const remaining = MAX_GLOBAL_CHARS - used;
    const slice = ch.text.slice(0, remaining);
    const header = `--- Глава ${ch.order}: ${ch.title} ---\n`;
    parts.push(header + slice);
    used += slice.length + header.length;
  }
  return parts.join('\n\n');
}

export interface ExtractCharactersPromptOptions {
  priors?: SeriesPriorCharacter[];
  candidateSeriesBooks?: { title: string; author: string }[];
}

export function extractCharactersPrompt(
  book: ParsedFB2,
  options: ExtractCharactersPromptOptions = {},
): string {
  const snippet = buildBookSnippet(book);

  const priorsBlock = options.priors && options.priors.length > 0
    ? `\nИзвестные персонажи серии (из предыдущих книг той же серии в нашей базе) — переиспользуй эти ИМЕНА, ОПИСАНИЯ и СТИЛИ если те же персонажи есть в этой книге, чтобы озвучка была консистентной между книгами:\n${options.priors
        .map(
          (p) =>
            `- ${p.name} (из «${p.fromBookTitle}»): ${p.description}. Стиль/характер: ${p.styleHint || 'не задан'}.`,
        )
        .join('\n')}\n`
    : '';

  const candidatesBlock = options.candidateSeriesBooks && options.candidateSeriesBooks.length > 0
    ? `\nКниги того же автора в нашей базе (возможно, та же серия — реши сам):\n${options.candidateSeriesBooks
        .map((b) => `- «${b.title}» — ${b.author}`)
        .join('\n')}\n`
    : '';

  return `Ты — литературный аналитик, готовящий сценарий многоголосой аудиокниги. Прочитай книгу и верни СТРОГО JSON со списком значимых действующих лиц + информацию о книжной серии.

Книга: "${book.title || 'Untitled'}"
Автор: ${book.author || 'неизвестен'}
${candidatesBlock}${priorsBlock}
Текст (может быть сокращён):
${snippet}

Верни JSON со схемой:
{
  "series": {
    "name": "Название серии (если книга часть серии — например 'Метро 2033', 'Сварог', 'Гарри Поттер'). Если не часть серии — null",
    "index": 1,
    "confidence": "high" | "medium" | "low"
  },
  "characters": [
    {
      "name": "Имя персонажа",
      "description": "1-2 предложения: кто это и какую роль играет",
      "isMain": true,
      "suggestedGender": "male" | "female" | "neutral",
      "suggestedTone": "youthful" | "mature" | "elderly" | "child" | "intimidating" | "warm" | "authoritative" | "neutral",
      "styleHint": "Краткое описание манеры речи: возраст, темп, эмоциональность, акцент. Например: 'молодой испуганный мальчик, говорит сбивчиво', 'строгая властная женщина средних лет, чёткая дикция', 'старик-ворчун с хриплым голосом и медленным темпом'."
    }
  ]
}

Правила:
- Серию определяй по названию книги, метаданным и тексту. Если не уверен — confidence: "low" и name: null.
- Не более 12 персонажей. Если их больше — оставь самых значимых.
- Не включай безымянных эпизодических персонажей и персонажей, упомянутых только косвенно.
- НЕ включай рассказчика — он будет добавлен системно отдельным слотом.
- isMain = true только для центральных героев (3-5 максимум), остальные — false.
- suggestedGender: ОБЯЗАТЕЛЬНО определи пол. "neutral" — только для бесполых сущностей (ИИ, дух, безликий хор).
- styleHint: ОБЯЗАТЕЛЬНОЕ поле, не оставляй пустым. Опиши характер и манеру речи в 1-2 предложениях, чтобы TTS-модель смогла озвучить персонажа отличающимся голосом. Учитывай возраст, эмоциональный фон, социальный статус, диалект/акцент если указан в тексте.
- Если персонаж совпадает с известным из priors — переиспользуй его описание и стиль (можешь чуть уточнить).
- Только JSON, без markdown-фенсов и без комментариев.`;
}

const MAX_CHAPTER_CHARS = 30_000;

export interface MarkupChapterPromptOptions {
  chapterTitle: string;
  chapterOrder: number;
  text: string;
  casting: BookCasting;
}

export function markupChapterPrompt(opts: MarkupChapterPromptOptions): string {
  const text = opts.text.slice(0, MAX_CHAPTER_CHARS);
  const characterList = opts.casting.characters
    .map((c) => `- "${c.name}"${c.isMain ? ' (главный)' : ''}: ${c.description}`)
    .join('\n');

  return `Ты — режиссёр аудиокниги. Размечай текст главы на блоки реплик и авторской речи для многоголосой озвучки.

Глава ${opts.chapterOrder}: "${opts.chapterTitle}"

Действующие лица книги (используй ИМЕНА именно из этого списка как значение поля "speaker"):
${characterList || '— (нет известных персонажей, всё текст рассказчика)'}

Системный спикер для авторской речи и описаний: "${NARRATOR_SPEAKER}".

Текст главы (может быть сокращён для экономии токенов):
"""
${text}
"""

Верни JSON со схемой:
{
  "blocks": [
    {
      "speaker": "${NARRATOR_SPEAKER}" | "Имя персонажа",
      "text": "Точный текст реплики или фрагмент авторского текста (сохраняй пунктуацию).",
      "emotion": "коротко: спокойно / гневно / шёпотом / испуганно / задумчиво / устало / ... (опционально)",
      "audioTag": "Опциональная audio-tag метка для Gemini TTS, например '[laughs]', '[sigh]', '[whispers]', '[злобно]' (опционально)"
    }
  ]
}

Правила разметки:
- Каждый блок — это одна целостная порция аудиоречи: либо одна реплика персонажа, либо один кусок авторской речи между репликами.
- Не объединяй разных спикеров в один блок.
- Если в одном предложении автор приводит реплику ("— Привет, — сказал Иван."), РАЗДЕЛИ на 2 блока: реплика Ивана с текстом "— Привет," и блок рассказчика "— сказал Иван.".
- speaker должен ТОЧНО совпадать с одним из имён выше или быть "${NARRATOR_SPEAKER}". Если ты не уверен в спикере — ставь "${NARRATOR_SPEAKER}".
- Если персонаж говорит, но его нет в списке выше — всё равно добавляй блок, но speaker = "${NARRATOR_SPEAKER}" (озвучит рассказчик).
- emotion и audioTag — опциональны. Используй emotion для базового тона, audioTag — только когда уверен (явный смех, шёпот, ярость в тексте).
- Сохраняй ИСХОДНЫЕ слова и пунктуацию текста. Не пересказывай и не сокращай.
- Не более 250 блоков на главу. Если глава длинная — режь крупнее на абзац рассказчика.
- Только JSON, без markdown-фенсов.`;
}
