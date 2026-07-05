/**
 * Shared utilities for reading encyclopedia markdown files at build time
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const CATEGORIES = ['суждение', 'память', 'само', 'социальное', 'внимание', 'вероятность'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface ParsedBias {
  slug: string;
  title: string;
  titleEn: string;
  titleRu: string;
  description: string;
  category: Category;
  aliases: string[];
  date?: string;
  content: string;
  body: string;
}

const FRONTMATTER_RE = /\*\*Status:\*\*[^\n]*\n\*\*Date:\*\*[^\n]*\n\*\*Domain:\*\*[^\n]*\n*\n# (.+?)\s*\(([^)]+)\)/;
const ALIASES_RE = /\*\*Также известно как:\*\*\s*([^\n]+)/;
const CATEGORY_RE = /\*\*Категория:\*\*\s*(\S+)/;

export function parseBiasContent(content: string): Omit<ParsedBias, 'slug'> {
  const titleMatch = content.match(FRONTMATTER_RE);
  if (!titleMatch) {
    throw new Error('No valid title (expected "# English (Русский)" after header)');
  }
  const titleEn = titleMatch[1].trim();
  const titleRu = titleMatch[2].trim();
  const title = `${titleEn} (${titleRu})`;

  const aliasesMatch = content.match(ALIASES_RE);
  const aliases = aliasesMatch
    ? aliasesMatch[1]
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a && a !== 'нет')
    : [];

  const categoryMatch = content.match(CATEGORY_RE);
  if (!categoryMatch) {
    throw new Error('No category found');
  }
  const category = categoryMatch[1] as Category;

  const dateMatch = content.match(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : undefined;

  const descMatch = content.match(/## Определение\s*\n+([^#]+?)(?=\n##|\Z)/s);
  let description = '';
  if (descMatch) {
    const text = descMatch[1].trim().replace(/\n+/g, ' ');
    const sentences = text.split(/(?<=[.!?])\s+/);
    description = sentences.slice(0, 2).join(' ');
    if (description.length > 250) {
      description = description.slice(0, 247) + '...';
    }
  }
  if (!description) description = title;

  const titleMatchEnd = content.match(FRONTMATTER_RE);
  const body = titleMatchEnd
    ? content.substring(titleMatchEnd.index! + titleMatchEnd[0].length).trim()
    : content;

  return {
    title,
    titleEn,
    titleRu,
    description,
    category,
    aliases,
    date,
    content,
    body,
  };
}

export async function loadAllBiases(): Promise<ParsedBias[]> {
  const contentPath = process.env.CONTENT_PATH;
  if (!contentPath) {
    throw new Error('CONTENT_PATH env variable is not set');
  }
  const catalogDir = join(contentPath, 'ru/5. Каталог');
  const allFiles = await readdir(catalogDir);
  const mdFiles = allFiles.filter((f) => f.endsWith('.md'));

  const biases: ParsedBias[] = [];
  for (const file of mdFiles) {
    const filepath = join(catalogDir, file);
    try {
      const content = await readFile(filepath, 'utf-8');
      const parsed = parseBiasContent(content);
      biases.push({
        slug: basename(file, '.md'),
        ...parsed,
      });
    } catch (err) {
      console.warn(`[biases] Skipping ${file}: ${(err as Error).message}`);
    }
  }

  return biases.sort((a, b) => a.title.localeCompare(b.title));
}

export async function loadBiasBySlug(slug: string): Promise<ParsedBias | null> {
  const all = await loadAllBiases();
  return all.find((b) => b.slug === slug) || null;
}
