# Cognitive Bias Encyclopedia — Website

Static website for the [Cognitive Bias Encyclopedia](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia) — an open Russian-language encyclopedia of cognitive biases built with [Astro](https://astro.build/) + Tailwind CSS.

🌐 **Live site:** https://vladimirmyshkovski.github.io/cognitive-bias-site/

The content lives in a separate repo: **[vladimirmyshkovski/cognitive-bias-encyclopedia](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia)**. This repo only contains the rendering layer.

---

## What it does

- Renders each encyclopedia entry (`ru/5. Каталог/*.md`) as a separate page
- Catalogs at `/biases/` and `/categories/<name>/` (paginated, 24 entries per page)
- Open Graph / Twitter meta tags for social previews (uses entry description, stripped of markdown)
- OG images at `/og/<slug>.png` (generated post-build via `npm run og`)
- Search powered by [Pagefind](https://pagefind.app/) — full-text search over all entries, built at static-site generation time
- `llms.txt` and `llms-full.txt` for AI agents (auto-generated on build)
- Sitemap at `/sitemap-index.xml`
- Russian UI, semantically correct HTML, keyboard-navigable

## Stack

- **Astro** — static site generator, plain HTML/CSS, no client-side JS framework
- **Tailwind CSS** — utility CSS, dark mode via `prefers-color-scheme`
- **Pagefind** — static full-text search
- **Satori + Sharp** — OG image generation (post-build, via standalone Node script)
- **GitHub Pages** — hosting + CI/CD

## Architecture

```
.
├── astro.config.mjs              # Astro config (site URL, base path /cognitive-bias-site)
├── .github/workflows/deploy.yml # CI: build & deploy on push to master
├── src/
│   ├── pages/
│   │   ├── index.astro                  # Home
│   │   ├── biases/
│   │   │   ├── index.astro              # Catalog (page 1)
│   │   │   ├── page/[page].astro        # Catalog pages 2+
│   │   │   └── [...slug].astro          # Individual bias entry
│   │   └── categories/
│   │       ├── index.astro              # Category index
│   │       ├── [category]/index.astro   # Category page 1
│   │       └── [category]/page/[page].astro  # Category pages 2+
│   ├── components/
│   │   ├── Navbar.astro, Footer.astro, Search.astro, Pagination.astro
│   ├── layouts/BaseLayout.astro         # HTML shell, meta tags, JSON-LD
│   ├── lib/
│   │   ├── biases.ts                    # Read & parse .md files
│   │   └── markdown.ts                  # Render markdown → HTML, strip → meta
│   ├── integrations/
│   │   ├── llms.ts                      # llms.txt generator (Astro hook)
│   │   └── fonts/                       # fonts used by OG image script
│   └── content.config.ts                # Astro Content Collection schema (legacy; see migration doc)
├── scripts/
│   └── generate-og.ts                   # Standalone OG image generator
├── docs/
│   └── MIGRATION_TO_CONTENT_COLLECTIONS.md  # Plan for Astro CC migration
└── CONTENT_PATH env var points to the encyclopedia repo
```

The encyclopedia directory is **cloned as a sibling repo** in CI at the path pointed to by `CONTENT_PATH`. See [CONTRIBUTING.md](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia/blob/main/ru/CONTRIBUTING.md) in the content repo for the entry template.

## Local development

```bash
# Clone the encyclopedia content into a sibling directory
git clone https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia ~/content

# Install deps
npm install

# Build (outputs to dist/)
CONTENT_PATH=~/content npm run build

# Generate OG images
CONTENT_PATH=~/content npm run og

# Or do both at once
CONTENT_PATH=~/content npm run build:full

# Preview built site
npm run preview
```

To work on the live content, point `CONTENT_PATH` at your local clone of the encyclopedia repo.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) on every push to `master`:

1. Check out this repo
2. Check out the encyclopedia repo as a sibling directory
3. `npm ci`
4. Build with the encyclopedia as `CONTENT_PATH` (generates `dist/`)
5. Generate OG images (`npm run og`, copies to `dist/og/`)
6. Build Pagefind search index
7. Deploy `dist/` to GitHub Pages

The site URL is configured via `astro.config.mjs → site` and `base: '/cognitive-bias-site'`.

## Adding new entries

You don't — content lives in the encyclopedia repo. Add a new file at `ru/5. Каталог/<English name>.md` there following the [CONTRIBUTING.md](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia/blob/main/ru/CONTRIBUTING.md) template.

**Deployment from content changes:** currently requires an empty commit in this repo to re-trigger GitHub Actions, because the build workflow listens to `master` here, not to `main` in the encyclopedia repo. To automate, add a `repository_dispatch` webhook from the encyclopedia repo to this one (out of scope for now).

## License

Content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — see the encyclopedia repo.
Code: see `LICENSE` in this repo.