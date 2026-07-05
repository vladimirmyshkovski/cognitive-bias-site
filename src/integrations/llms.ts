/**
 * llms.txt and llms-full.txt generation integration
 * Creates files for LLM crawlers
 */
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadAllBiases } from '../lib/biases';

interface LlmsOptions {
  contentPath: string;
}

export function llmsIntegration(_options: LlmsOptions) {
  return {
    name: 'llms',
    hooks: {
      'astro:build:done': async () => {
        const distDir = join(dirname(fileURLToPath(import.meta.url)), '../../dist');
        const entries = await loadAllBiases();

        await generateLlmsTxt(entries, distDir);
        await generateLlmsFullTxt(entries, distDir);

        console.log(`[llms] ✓ Generated llms.txt and llms-full.txt (${entries.length} entries)`);
      },
    },
  };
}

async function generateLlmsTxt(entries: Awaited<ReturnType<typeof loadAllBiases>>, publicDir: string) {
  const grouped: Record<string, typeof entries> = {};
  for (const e of entries) {
    const cat = e.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(e);
  }

  let content = `# Cognitive Bias Encyclopedia

> Open, multilingual encyclopedia of cognitive biases — ${entries.length} entries (RU),
> structured by function, with dialectical and philosophical context.

## Categories

`;

  for (const [cat, items] of Object.entries(grouped).sort()) {
    content += `### ${cat} (${items.length})\n\n`;
    for (const e of items) {
      content += `- ${e.title}: ${e.description || ''}\n`;
    }
    content += '\n';
  }

  content += `## Full content

For complete content of all ${entries.length} entries, see [llms-full.txt](https://vladimirmyshkovski.github.io/cognitive-bias-site/llms-full.txt).

## Source

- GitHub: https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia
`;

  await fs.writeFile(join(publicDir, 'llms.txt'), content, 'utf-8');
}

async function generateLlmsFullTxt(entries: Awaited<ReturnType<typeof loadAllBiases>>, publicDir: string) {
  let content = `# Cognitive Bias Encyclopedia — Full Content

> Complete text of all ${entries.length} entries. For an overview, see [llms.txt](llms.txt).

`;

  for (const e of entries) {
    content += `\n---\n\n# ${e.title}\n\n`;
    if (e.category) content += `**Category:** ${e.category}\n\n`;
    if (e.description) content += `**Description:** ${e.description}\n\n`;
    content += e.body;
    content += '\n';
  }

  await fs.writeFile(join(publicDir, 'llms-full.txt'), content, 'utf-8');
}
