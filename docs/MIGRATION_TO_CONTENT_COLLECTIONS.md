# Migration Plan: loadAllBiases() → Astro Content Collections

## Context

The site reads encyclopedia markdown at build time through `CONTENT_PATH` and a
hand-written parser (`src/lib/biases.ts`). Astro Content Collections offer
built-in type safety, caching, and schema validation.

> **Status as of 2026-11-08:** the migration is **not done** and is **not
> scheduled**. An earlier version of this document proposed a separate
> `src/content.config.ts` + `src/loaders/biases.ts` pair as the migration
> target. That scaffolding existed but was **never wired into the build** — no
> page imported it — and it was **removed** (see ISSUE-02). The notes below are
> kept as a record of what a future migration has to get right.

**Trade-offs:**

| | Current (`loadAllBiases`) | Content Collections |
|---|---|---|
| Build-time perf | Catalog read once per process and cached | Cached by Astro; reads once |
| Type safety | Manual TypeScript types | Zod schema → typed entries |
| Wiki-link rendering | Custom regex in `markdown.ts` | Astro built-in (or remark plugin) |
| Hot-reload (dev) | Re-reads on every change | Built-in |
| Migration effort | — | Medium (rewrite 7 page files) |

## Current Architecture

```
src/
├── lib/
│   ├── biases.ts              # parseBiasContent + loadAllBiases (active)
│   └── markdown.ts            # renderMarkdown + stripMarkdown
└── pages/
    ├── index.astro            # Uses loadAllBiases
    ├── search.astro           # Dedicated search page (Pagefind)
    ├── biases/index.astro     # Uses loadAllBiases
    ├── biases/page/[page].astro # Uses loadAllBiases via paginate()
    ├── biases/[...slug].astro # Uses loadAllBiases via getStaticPaths
    ├── categories/index.astro # Uses loadAllBiases
    ├── categories/[category]/index.astro # Uses loadAllBiases
    └── categories/[category]/page/[page].astro
```

`src/lib/biases.ts` reads the catalog once per process and hands out copies
(ISSUE-05). The performance argument for migrating is therefore weaker than it
was when this plan was written — the remaining benefit is type safety.

## Target Architecture

```
src/
├── content.config.ts          # Single source of truth
├── loaders/biases.ts          # Implements Astro Loader API
├── lib/
│   ├── markdown.ts            # Keep for body rendering + meta helpers
│   └── queries.ts             # New: typed query helpers (getBySlug, getByCategory)
└── pages/
    └── *.astro                # Use getCollection('biases') instead of loadAllBiases()
```

## ⚠️ What the old scaffolding got wrong

The deleted `src/loaders/biases.ts` was a near-copy of `src/lib/biases.ts`
with **different behaviour in four places**. Anyone porting it back verbatim
would have broken the site. Do not resurrect it as-is:

| # | `src/lib/biases.ts` (working) | deleted `src/loaders/biases.ts` | Consequence |
|---|---|---|---|
| 1 | slug = kebab-case from filename (`anchoring`, `self-serving-bias`) | slug = raw basename (`Anchoring`, `Self-serving Bias`) | **All 61 entry URLs change** → every external link 404s |
| 2 | body = everything after the header block (`Status`/`Date`/`Domain`/`# Title`) | body = everything after the **first** `---` | metadata block leaks into the page body |
| 3 | description lookahead `(?=\n##\|\n---)` | lookahead `(?=\n##\|\Z)` | `---` inside a section is swallowed into the description |
| 4 | title parsed from `FRONTMATTER_RE` (requires the 3 header fields) | parsed from a loose `/^# (.+?)\s*\((.+?)\)\s*$/m` | entries without a header are parsed differently from the working code |

A migration must port the **behaviour of `src/lib/biases.ts`**, not the
behaviour of the deleted loader. `slugify()` in `src/lib/markdown.ts` is the
single source of truth for slugs and must be reused for the collection `id`.

## Migration Steps

### Phase 1: Foundation (safe, doesn't break anything)

1. Write a loader that reproduces `parseBiasContent()` **exactly** (see the
   table above), reusing `slugify()` for ids
2. Register the collection in `src/content.config.ts` with a Zod schema
3. Verify `getCollection('biases')` returns the expected 61 entries **with the
   same ids as the current slugs**
4. Keep `src/lib/biases.ts` as a shim delegating to `getCollection()`

### Phase 2: Migrate pages one by one

For each page file:

1. Replace `import { loadAllBiases } from '../lib/biases'` with `import { getCollection } from 'astro:content'`
2. Replace `await loadAllBiases()` with `(await getCollection('biases')).map(e => ({...e.data, slug: e.id, body: e.body}))`
3. Test that page still renders correctly

**Files in order of complexity:**

1. `categories/index.astro` — simple list
2. `categories/[category]/index.astro` — filter by category
3. `biases/index.astro` — list with pagination
4. `biases/page/[page].astro` — paginate
5. `biases/[...slug].astro` — single entry + getStaticPaths
6. `categories/[category]/page/[page].astro` — paginate by category
7. `index.astro` — recent + categories

### Phase 3: Cleanup

1. Delete `src/lib/biases.ts` (replaced by queries.ts)
2. Update `src/integrations/llms.ts` to use new query helpers
3. Update `scripts/generate-og.ts` to use new query helpers

## Risks

- **Slug generation**: Astro uses the filename by default for `id`. It must be
  overridden with the kebab-case slug, otherwise URLs break (see table above).
- **Body rendering**: `entry.body` is raw markdown; `renderMarkdown()` is still
  needed for HTML output.
- **Description metadata**: the schema must parse `description` correctly
  (it's derived from the `## Определение` section, not from frontmatter).
- **Wiki-link rendering**: not part of Astro's default markdown pipeline for
  `.md` files loaded via a custom loader — `renderMarkdown()` must stay.
- **knownSlugs**: `renderMarkdown()` now takes the set of catalog slugs as a
  required third argument (ISSUE-11). Whatever replaces `loadAllBiases()` must
  provide it, otherwise wiki-links fall back to plain italic text.

## Estimated effort

- Phase 1: 1-2 hours
- Phase 2: 2-3 hours (one page at a time, easy to verify)
- Phase 3: 30 min

**Total: ~4-6 hours of focused work.**

## Out of scope

- Migrating the Astro markdown pipeline for inline JSX (not needed for this site — we use raw markdown rendering)
- Replacing `markdown.ts` entirely (it works; Content Collections doesn't change this)
