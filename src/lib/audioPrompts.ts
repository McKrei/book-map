import type { ParsedFB2 } from '../types';

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

export function extractCharactersPrompt(book: ParsedFB2): string {
  const snippet = buildBookSnippet(book);

  return `Ты — литературный аналитик, готовящий сценарий многоголосой аудиокниги. Прочитай книгу и верни СТРОГО JSON со списком значимых действующих лиц.

Книга: "${book.title || 'Untitled'}"
Автор: ${book.author || 'неизвестен'}

Текст (может быть сокращён):
${snippet}

Верни JSON со схемой:
{
  "characters": [
    {
      "name": "Имя персонажа",
      "description": "1-2 предложения: кто это и какую роль играет",
      "isMain": true,
      "suggestedGender": "male" | "female" | "neutral",
      "suggestedTone": "youthful" | "mature" | "elderly" | "child" | "intimidating" | "warm" | "authoritative" | "neutral"
    }
  ]
}

Правила:
- Не более 12 персонажей. Если их больше — оставь самых значимых.
- Не включай безымянных эпизодических персонажей и персонажей, упомянутых только косвенно.
- НЕ включай рассказчика — он будет добавлен системно отдельным слотом.
- isMain = true только для центральных героев (3-5 максимум), остальные — false.
- Только JSON, без markdown-фенсов и без комментариев.`;
}
