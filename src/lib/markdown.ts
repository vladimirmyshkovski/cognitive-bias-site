/**
 * Minimal markdown-to-HTML renderer.
 * Handles the subset used in the encyclopedia: ## headings, lists, **bold**, [text](url), [[wiki-links]].
 *
 * @param md   - Markdown source
 * @param base - Site base path (e.g. '/cognitive-bias-site/'). All internal links
 *               (catalog wiki-links) are prefixed with this. Required — pass
 *               `import.meta.env.BASE_URL.replace(/\/?$/, '/')` from .astro files.
 * @param knownSlugs - Optional set of catalog slugs. Wiki-links pointing at
 *               non-catalog entries (e.g. [[Диалектическое мышление]]) are
 *               rendered as plain italic text instead of broken links.
 */
export async function renderMarkdown(
  md: string,
  base: string,
  knownSlugs: Set<string> = new Set()
): Promise<string> {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;
  let inOrderedList = false;
  let inParagraph = false;
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      const text = paragraphBuffer.join(' ').trim();
      if (text) out.push(`<p>${inline(text)}</p>`);
      paragraphBuffer = [];
    }
    inParagraph = false;
  }

  function inline(s: string): string {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Catalog wiki-links with alias: [[ru/5. Каталог/Name|alias]]
      .replace(/\[\[ru\/5\. Каталог\/([^\]|]+)\|([^\]]+)\]\]/g, (_, name, alias) =>
        `<a href="${base}biases/${slugify(name)}/">${inline(alias)}</a>`
      )
      // Catalog wiki-links without alias: [[ru/5. Каталог/Name]]
      .replace(/\[\[ru\/5\. Каталог\/([^\]]+)\]\]/g, (_, name) =>
        `<a href="${base}biases/${slugify(name)}/">${inline(name)}</a>`
      )
      // Non-catalog wiki-links with alias: [[Name|alias]] — render as plain text
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, _name, alias) =>
        `<span class="text-slate-500 italic">${inline(alias)}</span>`
      )
      // Non-catalog wiki-links without alias: [[Name]] — render as plain text
      .replace(/\[\[([^\]]+)\]\]/g, (_, name) =>
        `<span class="text-slate-500 italic">${inline(name)}</span>`
      )
      // Markdown links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Headings
    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h2) {
      flushParagraph();
      out.push(`<h2 id="${slugify(h2[1])}">${inline(h2[1])}</h2>`);
      continue;
    }
    if (h3) {
      flushParagraph();
      out.push(`<h3 id="${slugify(h3[1])}">${inline(h3[1])}</h3>`);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---') {
      flushParagraph();
      out.push('<hr />');
      continue;
    }

    // Blockquote
    const bq = trimmed.match(/^>\s*(.*)$/);
    if (bq) {
      flushParagraph();
      out.push(`<blockquote>${inline(bq[1])}</blockquote>`);
      continue;
    }

    // Unordered list
    const ul = trimmed.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushParagraph();
      if (inOrderedList) {
        out.push('</ol>');
        inOrderedList = false;
      }
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      flushParagraph();
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (!inOrderedList) {
        out.push('<ol>');
        inOrderedList = true;
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    // Close lists on non-list line
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
    if (inOrderedList) {
      out.push('</ol>');
      inOrderedList = false;
    }

    // Empty line: paragraph break
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Regular text — accumulate paragraph
    inParagraph = true;
    paragraphBuffer.push(trimmed);
  }

  // Close any open tags
  flushParagraph();
  if (inList) out.push('</ul>');
  if (inOrderedList) out.push('</ol>');

  return out.join('\n');
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, '-')
    .replace(/^-|-$/g, '');
}