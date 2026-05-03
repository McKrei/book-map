import type { ParsedFB2 } from '../types';
import type { SeriesPriorCharacter } from '../types/audio';

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
