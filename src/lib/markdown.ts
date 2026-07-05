/**
 * Minimal markdown-to-HTML renderer
 * Handles the subset used in the encyclopedia: ## headings, lists, **bold**, [text](url)
 */
export async function renderMarkdown(md: string): Promise<string> {
  // We use a simple regex-based approach to avoid pulling in heavy dependencies
  // The encyclopedia uses a limited markdown subset that we handle here

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
      // **bold**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // *italic* (avoid matching **)
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // [[Wiki Link|alias]] → internal link
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="$1">$2</a>')
      // [[Wiki Link]] → internal link
      .replace(/\[\[([^\]]+)\]\]/g, '<a href="$1">$1</a>')
      // [text](url) → external/markdown link
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // `code`
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\wа-яё\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
