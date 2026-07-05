/**
 * OG Image generation integration
 * Generates PNG images for each bias using Satori + Sharp
 */
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { loadAllBiases } from '../lib/biases';

interface OgImageOptions {
  contentPath: string;
}

export function ogImageIntegration(options: OgImageOptions) {
  return {
    name: 'og-image',
    hooks: {
      'astro:build:done': async () => {
        try {
          const ogDir = new URL('./public/og/', import.meta.url).pathname;
          const biases = await loadAllBiases();
          console.log(`[og-image] Generating ${biases.length} OG images...`);

          await fs.mkdir(ogDir, { recursive: true });
          for (const bias of biases) {
            try {
              const svg = await satori(
                renderOgTemplate(bias.title, bias.category, bias.description),
                {
                  width: 1200,
                  height: 630,
                  fonts: [
                    {
                      name: 'Inter',
                      data: await loadFont(),
                      weight: 400,
                      style: 'normal',
                    },
                    {
                      name: 'Inter',
                      data: await loadFont(),
                      weight: 700,
                      style: 'normal',
                    },
                  ],
                }
              );

              const png = await sharp(Buffer.from(svg)).png().toBuffer();
              await fs.writeFile(join(ogDir, `${bias.slug}.png`), png);
            } catch (err) {
              console.warn(`[og-image] Skipping ${bias.slug}: ${(err as Error).message}`);
            }
          }

          console.log(`[og-image] ✓ Generated OG images`);
        } catch (err) {
          console.warn(`[og-image] Skipped: ${(err as Error).message}`);
        }
      },
    },
  };
}

function renderOgTemplate(title: string, category: string, description: string) {
  return {
    type: 'div',
    props: {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        backgroundImage:
          'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0f172a 100%)',
        padding: '60px 80px',
        fontFamily: 'Inter',
        color: 'white',
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '40px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '999px',
                    fontSize: '28px',
                    fontWeight: 700,
                  },
                  children: category || 'cognitive bias',
                },
              },
              {
                type: 'div',
                props: {
                  style: { fontSize: '24px', opacity: 0.7 },
                  children: 'Cognitive Bias Encyclopedia',
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '72px',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '40px',
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '32px',
              opacity: 0.85,
              lineHeight: 1.4,
              maxWidth: '90%',
            },
            children: description,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '60px',
              right: '80px',
              fontSize: '24px',
              opacity: 0.5,
            },
            children: 'github.com/vladimirmyshkovski/cognitive-bias-encyclopedia',
          },
        },
      ],
    },
  };
}

async function loadFont(): Promise<ArrayBuffer> {
  const { readFile } = await import('node:fs/promises');
  const fontPath = new URL('./fonts/Inter-Regular.woff', import.meta.url);
  const buffer = await readFile(fontPath);
  return buffer.buffer;
}
