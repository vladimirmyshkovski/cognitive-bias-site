/**
 * Custom Astro content loader for the cognitive bias encyclopedia
 * Parses the inline metadata format (e.g., **Status:** `reference`)
 * used in the encyclopedia's .md files
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const CATEGORIES = ['суждение', 'память', 'само', 'социальное', 'внимание', 'вероятность'] as const;
type Category = (typeof CATEGORIES)[number];

interface ParsedMeta {
  title: string;
  description: string;
  category: Category;
  aliases: string[];
  date?: string;
}

function parseInlineMetadata(content: string): { meta: ParsedMeta; body: string } {
  // Extract title from H1: "# English (Русский)"
  const h1Match = content.match(/^# (.+?)\s*\((.+?)\)\s*$/m);
  if (!h1Match) {
    throw new Error('No valid H1 title found (expected "# English (Русский)")');
  }
  const englishTitle = h1Match[1].trim();
  const russianTitle = h1Match[2].trim();
  const title = `${englishTitle} (${russianTitle})`;

  // Extract aliases: **Также известно как:** alias1, alias2
  const aliasesMatch = content.match(/\*\*Также известно как:\*\*\s*(.+?)(?:\n|$)/m);
  const aliases = aliasesMatch
    ? aliasesMatch[1]
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a && a !== 'нет')
    : [];

  // Extract category: **Категория:** X (description)
  const categoryMatch = content.match(/\*\*Категория:\*\*\s*(\S+)/);
  if (!categoryMatch) {
    throw new Error('No category found (expected "**Категория:** X")');
  }
  const category = categoryMatch[1] as Category;

  // Extract date: **Date:** YYYY-MM-DD
  const dateMatch = content.match(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : undefined;

  // Extract description from the first paragraph after "## Определение"
  const descMatch = content.match(/## Определение\s*\n+([^#]+?)(?=\n##|\n---|\Z)/s);
  let description = '';
  if (descMatch) {
    // Take first 1-2 sentences (up to ~200 chars)
    const text = descMatch[1].trim().replace(/\n+/g, ' ');
    const sentences = text.split(/(?<=[.!?])\s+/);
    description = sentences.slice(0, 2).join(' ');
    if (description.length > 250) {
      description = description.slice(0, 247) + '...';
    }
  }

  // Extract body (everything after the first --- separator)
  const bodyMatch = content.match(/---\s*\n([\s\S]+)$/);
  const body = bodyMatch ? bodyMatch[1] : content;

  const meta: ParsedMeta = {
    title,
    description: description || title,
    category,
    aliases,
    date,
  };

  return { meta, body };
}

export function biasLoader() {
  return {
    name: 'bias-loader',
    load: async ({ store }: { store: { set: (entry: any) => void } }) => {
      const contentPath = process.env.CONTENT_PATH;
      if (!contentPath) {
        throw new Error('CONTENT_PATH env variable is not set');
      }
      const catalogDir = join(contentPath, 'ru/5. Каталог');
      const files = await readdir(catalogDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filepath = join(catalogDir, file);
        const content = await readFile(filepath, 'utf-8');
        try {
          const { meta, body } = parseInlineMetadata(content);
          const slug = basename(file, '.md');
          store.set({
            id: slug,
            data: meta,
            body,
          });
        } catch (err) {
          console.warn(`[bias-loader] Skipping ${file}: ${(err as Error).message}`);
        }
      }
    },
  };
}
