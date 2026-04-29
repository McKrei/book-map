import type { ParsedFB2, AIAnalysisResult } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey(): string {
  return localStorage.getItem('openrouter_api_key') || import.meta.env.VITE_OPENROUTER_API_KEY || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem('openrouter_api_key', key);
}

export function isAIConfigured(): boolean {
  return Boolean(getApiKey());
}

const COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#e11d48', '#7c3aed', '#0ea5e9', '#d946ef',
];

function buildPrompt(book: ParsedFB2): string {
  const chaptersText = book.chapters
    .map((ch) => `--- Глава ${ch.order}: ${ch.title} ---\n${ch.text.slice(0, 3000)}`)
    .join('\n\n');

  return `Ты — литературный аналитик. Проанализируй книгу и верни результат СТРОГО в JSON формате.

Книга: "${book.title}" автор: ${book.author || 'неизвестен'}

Текст глав (может быть сокращён):
${chaptersText}

Верни JSON объект со следующей структурой (без markdown, только чистый JSON):
{
  "characters": [
    {
      "name": "Имя персонажа",
      "description": "Краткое описание персонажа (2-3 предложения)",
      "first_appearance_chapter": 1,
      "color": "#6366f1"
    }
  ],
  "chapters": [
    {
      "title": "Название главы",
      "summary": "Краткое содержание главы (2-3 предложения)",
      "order": 1,
      "events": [
        {
          "title": "Краткое название события",
          "description": "Описание события",
          "event_type": "plot",
          "character_changes": [
            {
              "character_name": "Имя персонажа",
              "change_description": "Что изменилось в персонаже",
              "change_type": "development"
            }
          ]
        }
      ]
    }
  ]
}

Правила:
- event_type: "plot" (обычное событие), "character_intro" (появление персонажа), "character_change" (изменение персонажа), "climax" (кульминация), "resolution" (развязка)
- change_type: "development" (развитие), "death" (смерть), "transformation" (трансформация), "revelation" (откровение), "relationship" (отношения)
- Используй разные цвета для персонажей из этого списка: ${JSON.stringify(COLORS)}
- Выдели 2-5 основных событий на главу
- Выдели всех значимых персонажей
- Отвечай ТОЛЬКО JSON, без дополнительного текста`;
}

export async function analyzeBook(
  book: ParsedFB2,
  onProgress?: (message: string) => void,
): Promise<AIAnalysisResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured. Add VITE_OPENROUTER_API_KEY to your .env file.');
  }

  onProgress?.('Отправляю книгу на анализ...');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'BookMap',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: buildPrompt(book),
        },
      ],
      temperature: 0.3,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from AI');
  }

  onProgress?.('Обрабатываю результаты анализа...');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from AI response');
  }

  const result: AIAnalysisResult = JSON.parse(jsonMatch[0]);

  if (!result.characters || !result.chapters) {
    throw new Error('Invalid AI response structure');
  }

  return result;
}
