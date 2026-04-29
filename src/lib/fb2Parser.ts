import { XMLParser } from 'fast-xml-parser';
import type { ParsedFB2 } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['section', 'p', 'author'].includes(name),
});

function extractText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';

  const obj = node as Record<string, unknown>;

  if ('#text' in obj) return String(obj['#text']);

  let text = '';
  for (const key of Object.keys(obj)) {
    if (key.startsWith('@_')) continue;
    const val = obj[key];
    if (Array.isArray(val)) {
      text += val.map(extractText).join('\n');
    } else {
      text += extractText(val);
    }
  }
  return text;
}

function extractSectionTitle(section: Record<string, unknown>): string {
  if (section.title) {
    return extractText(section.title).trim();
  }
  return '';
}

function extractSectionText(section: Record<string, unknown>): string {
  const parts: string[] = [];

  if (section.p) {
    const paragraphs = Array.isArray(section.p) ? section.p : [section.p];
    for (const p of paragraphs) {
      parts.push(extractText(p).trim());
    }
  }

  return parts.filter(Boolean).join('\n');
}

export function parseFB2(content: string): ParsedFB2 {
  const parsed = parser.parse(content);
  const fb = parsed.FictionBook || parsed.fictionbook;

  if (!fb) {
    throw new Error('Invalid FB2 file: missing FictionBook root element');
  }

  const description = fb.description || {};
  const titleInfo = description['title-info'] || {};

  const bookTitle = extractText(titleInfo['book-title'] || 'Untitled');

  let authorName = '';
  if (titleInfo.author) {
    const authors = Array.isArray(titleInfo.author) ? titleInfo.author : [titleInfo.author];
    const firstAuthor = authors[0] || {};
    const parts = [
      extractText(firstAuthor['first-name'] || ''),
      extractText(firstAuthor['middle-name'] || ''),
      extractText(firstAuthor['last-name'] || ''),
    ].filter(Boolean);
    authorName = parts.join(' ');
  }

  const body = fb.body;
  const chapters: ParsedFB2['chapters'] = [];

  if (body) {
    const sections = body.section || [];
    const sectionArray = Array.isArray(sections) ? sections : [sections];

    sectionArray.forEach((section: Record<string, unknown>, index: number) => {
      const title = extractSectionTitle(section) || `Глава ${index + 1}`;
      let text = extractSectionText(section);

      if (section.section) {
        const subSections = Array.isArray(section.section)
          ? section.section
          : [section.section];
        for (const sub of subSections) {
          const subTitle = extractSectionTitle(sub as Record<string, unknown>);
          const subText = extractSectionText(sub as Record<string, unknown>);
          if (subTitle) text += `\n\n${subTitle}\n`;
          text += `\n${subText}`;
        }
      }

      chapters.push({
        title: title.trim(),
        text: text.trim(),
        order: index + 1,
      });
    });
  }

  return {
    title: bookTitle.trim(),
    author: authorName.trim(),
    chapters,
  };
}
