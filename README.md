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
- Search powered by [Pagefind](https://pagefind.app/) — full-text search over all entries, built at static-site generation time; available as a modal (⌘K / Ctrl+K) and as a dedicated page at `/search/` (`?q=` is accepted)
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
│   │   ├── search.astro                 # Dedicated search page (?q=)
│   │   ├── biases/
│   │   │   ├── index.astro              # Catalog (page 1)
│   │   │   ├── page/[page].astro        # Catalog pages 2+
│   │   │   └── [...slug].astro          # Individual bias entry
│   │   └── categories/
│   │       ├── index.astro              # Category index
│   │       ├── [category]/index.astro   # Category page 1
│   │       └── [category]/page/[page].astro  # Category pages 2+
│   ├── components/
│   │   ├── Navbar.astro, Footer.astro, Pagination.astro
│   │   ├── Search.astro                 # Search modal (not on /search/)
│   │   └── SearchPage.astro             # Search UI for /search/
│   ├── layouts/BaseLayout.astro         # HTML shell, meta tags, JSON-LD
│   ├── lib/
│   │   ├── biases.ts                    # Read & parse .md files (cached per build)
│   │   └── markdown.ts                  # Render markdown → HTML, strip → meta
│   ├── integrations/
│   │   ├── llms.ts                      # llms.txt generator (Astro hook)
│   │   └── fonts/                       # fonts used by OG image script
│   └── styles/global.css               # Tailwind + Pagefind UI overrides
├── scripts/
│   ├── generate-og.ts                   # Standalone OG image generator
│   └── check-lib.ts                    # Self-checks for parsing & rendering (npm run check)
├── docs/
│   ├── MIGRATION_TO_CONTENT_COLLECTIONS.md  # Plan for Astro CC migration
│   └── ISSUES.md                            # Tracker of known problems
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

# Build the search index (needed for search to work locally)
npm run pagefind

# Self-checks for parsing and markdown rendering
CONTENT_PATH=~/content npm run check

# Preview built site
npm run preview
```

To work on the live content, point `CONTENT_PATH` at your local clone of the encyclopedia repo.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) rebuilds and publishes on every push to `master`:

1. Check out this repo
2. Check out the encyclopedia repo as a sibling directory
3. `npm ci`
4. Build with the encyclopedia as `CONTENT_PATH` (generates `dist/`)
5. Generate OG images (`npm run og`, copies to `dist/og/`)
6. Build Pagefind search index
7. Deploy `dist/` to GitHub Pages

The workflow also listens for `repository_dispatch` with type `content-update`, which the
encyclopedia repo sends on every push to its `main` — so content changes publish
automatically. This requires the `SITE_DISPATCH_TOKEN` secret in the encyclopedia repo
(see its README). If that secret is missing, the site still deploys on manual pushes to
`master`, but content changes need an empty commit here to trigger a rebuild.

The site URL is configured via `astro.config.mjs → site` and `base: '/cognitive-bias-site'`.

## Adding new entries

You don't — content lives in the encyclopedia repo. Add a new file at `ru/5. Каталог/<English name>.md` there following the [CONTRIBUTING.md](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia/blob/main/ru/CONTRIBUTING.md) template.

**Deployment from content changes:** handled automatically — the encyclopedia repo sends a `repository_dispatch` on every push to its `main`, and the build workflow here listens for it. See [Deployment](#deployment).

## License

Content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — see the encyclopedia repo.
Code: see `LICENSE` in this repo.