/**
 * Minimal markdown-to-HTML renderer.
 * Handles the subset used in the encyclopedia: ## headings, lists, **bold**, [text](url), [[wiki-links]].
 *
 * @param md   - Markdown source
 * @param base - Site base path (e.g. '/cognitive-bias-site/'). All internal links
 *               (catalog wiki-links) are prefixed with this. Required — pass
 *               `import.meta.env.BASE_URL.replace(/\/?$/, '/')` from .astro files.
 * @param knownSlugs - Slugs of all catalog entries. A wiki-link whose target
 *               resolves to one of them becomes a link to `/biases/<slug>/`;
 *               anything else (e.g. [[Диалектическое мышление]]) is rendered as
 *               plain italic text instead of a broken link.
 */
export async function renderMarkdown(
  md: string,
  base: string,
  knownSlugs: Set<string>
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
      if (text) out.push(`<p>${inline(escapeHtml(text))}</p>`);
      paragraphBuffer = [];
    }
    inParagraph = false;
  }

  function inline(s: string): string {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Wiki-links: [[ru/5. Каталог/Name|alias]], [[Name|alias]], [[Name]]
      .replace(/\[\[([^\[\]\n]+?)\]\]/g, (_, raw: string) => {
        const [target, alias] = raw.split('|').map((part) => part.trim());
        const escapedName = target.replace(/^ru\/5\. Каталог\//, '');
        // slug считаем по неэкранированному имени: apostrophe в «Gambler's
        // Fallacy» иначе превратился бы в «gambler-39-s-fallacy»
        const slug = slugify(unescapeHtml(escapedName));
        const label = alias || escapedName;
        if (knownSlugs.has(slug)) {
          return `<a href="${base}biases/${slug}/">${inline(label)}</a>`;
        }
        return `<span class="text-slate-500 italic">${inline(label)}</span>`;
      })
      // Markdown links: [text](url). URL may contain balanced parentheses —
      // Elsevier DOIs look like 10.1016/0030-5073(75)90002-1.
      .replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, '<a href="$2">$1</a>')
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
      out.push(`<h2 id="${slugify(h2[1])}">${inline(escapeHtml(h2[1]))}</h2>`);
      continue;
    }
    if (h3) {
      flushParagraph();
      out.push(`<h3 id="${slugify(h3[1])}">${inline(escapeHtml(h3[1]))}</h3>`);
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
      out.push(`<blockquote>${inline(escapeHtml(bq[1]))}</blockquote>`);
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
      out.push(`<li>${inline(escapeHtml(ul[1]))}</li>`);
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
      out.push(`<li>${inline(escapeHtml(ol[1]))}</li>`);
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

/**
 * Escape the characters that could break out of HTML text or an attribute.
 * Applied to the source text *before* inline() runs, so the tags inline()
 * generates are never escaped and nested calls never escape twice.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Reverse of escapeHtml. Needed to recover a wiki-link target from escaped text. */
export function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Strip markdown formatting and wiki-link brackets, returning plain text.
 * Used for meta-description / og:description where raw markdown would leak.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate text for meta-description (155 chars is the typical safe limit
 * for Google/Twitter/Facebook). Cuts at the last sentence boundary within
 * the budget, falling back to the last word.
 */
export function truncateDescription(text: string, maxLen = 155): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const sentenceEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? ')
  );
  if (sentenceEnd > maxLen * 0.5) {
    return clean.slice(0, sentenceEnd + 1);
  }
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.5) {
    return clean.slice(0, lastSpace) + '…';
  }
  return clean.slice(0, maxLen - 1) + '…';
}
