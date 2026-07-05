import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { llmsIntegration } from './src/integrations/llms';

const CONTENT_PATH =
  process.env.CONTENT_PATH ||
  '/home/vladimirmyshkovski/Документы/Obsidian/Энциклопедии/Энциклопедия когнитивных искажений';

export default defineConfig({
  site: 'https://vladimirmyshkovski.github.io',
  base: '/cognitive-bias-site',
  output: 'static',

  integrations: [
    tailwind({ applyBaseStyles: true }),
    sitemap(),
    llmsIntegration({ contentPath: CONTENT_PATH }),
  ],

  vite: {
    resolve: {
      alias: {
        '@content': fileURLToPath(new URL(CONTENT_PATH, import.meta.url)),
      },
    },
  },

  build: {
    format: 'directory',
  },

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
