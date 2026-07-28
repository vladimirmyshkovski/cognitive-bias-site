# Cognitive Bias Encyclopedia — Website

Static website for the [Cognitive Bias Encyclopedia](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia) — an open Russian-language encyclopedia of cognitive biases built with [Astro](https://astro.build/) + Tailwind CSS.

🌐 **Live site:** https://vladimirmyshkovski.github.io/cognitive-bias-site/

The content lives in a separate repo: **[vladimirmyshkovski/cognitive-bias-encyclopedia](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia)**. This repo only contains the rendering layer.

---

## What it does

- Renders each encyclopedia entry (`ru/5. Каталог/*.md`) as a separate page
- Catalogs at `/biases/` and `/categories/<name>/` (paginated, 24 entries per page)
- Open Graph / Twitter meta tags for social previews (uses entry description, stripped of markdown)
- Search powered by [Pagefind](https://pagefind.app/) — full-text search over all entries, built at static-site generation time
- `llms.txt` and `llms-full.txt` for AI agents (auto-generated on build)
- Sitemap at `/sitemap-index.xml`
- Russian UI, semantically correct HTML, keyboard-navigable

## Stack

- **Astro** — static site generator, plain HTML/CSS, no client-side JS framework
- **Tailwind CSS** — utility CSS, dark mode via `prefers-color-scheme`
- **Pagefind** — static full-text search
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
│   └── integrations/llms.ts             # llms.txt generator
└── CONTENT_PATH env var points to the encyclopedia repo
```

The encyclopedia directory is **symlinked** (or cloned as a sibling repo in CI) at the path pointed to by `CONTENT_PATH`. See [CONTRIBUTING.md](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia/blob/main/CONTRIBUTING.md) in the content repo for the entry template.

## Local development

```bash
# One-time: link or clone the encyclopedia content
CONTENT_PATH="/home/user/Obsidian/Энциклопедии/Энциклопедия когнитивных искажений" \
  npm install

# Build (outputs to dist/)
CONTENT_PATH="..." npm run build

# Preview built site
npm run preview
```

To work on the live content, point `CONTENT_PATH` at your local clone of the encyclopedia repo:

```bash
git clone https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia ~/content
CONTENT_PATH=~/content npm run build
```

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) on every push to `master`:

1. Check out this repo
2. Check out the encyclopedia repo as a sibling directory
3. `npm ci`
4. Build with the encyclopedia as `CONTENT_PATH`
5. Deploy `dist/` to GitHub Pages

The site URL is configured via `astro.config.mjs → site` and `base: '/cognitive-bias-site'`.

## Adding new entries

You don't — content lives in the encyclopedia repo. Add a new file at `ru/5. Каталog/<English name>.md` there following the [AGENTS.md](https://github.com/vladimirmyshkovski/cognitive-bias-encyclopedia/blob/main/ru/AGENTS.md) template. The site rebuilds on the next push to that repo (via an empty commit trigger here, until cross-repo triggers are wired up).

## License

Content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — see the encyclopedia repo.
Code: see `LICENSE` in this repo.