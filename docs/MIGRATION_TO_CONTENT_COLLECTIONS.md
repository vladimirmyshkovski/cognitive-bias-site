# Migration Plan: loadAllBiases() → Astro Content Collections

## Context

The site currently uses a custom file-system loader (`src/lib/biases.ts`) that reads markdown files at build time via `CONTENT_PATH` env var. Astro Content Collections offer built-in type safety, caching, and schema validation.

**Trade-offs:**

| | Current (`loadAllBiases`) | Content Collections |
|---|---|---|
| Build-time perf | Reads all 61 files synchronously each call | Cached by Astro; reads once |
| Type safety | Manual TypeScript types | Zod schema → typed entries |
| Wiki-link rendering | Custom regex in `markdown.ts` | Astro built-in (or remark plugin) |
| Hot-reload (dev) | Re-reads on every change | Built-in |
| Migration effort | — | Medium (rewrite 4 page files) |

## Current Architecture

```
src/
├── content.config.ts          # Already defines schema (dead code)
├── loaders/biases.ts          # Custom loader (not registered)
├── lib/
│   ├── biases.ts              # parseBiasContent + loadAllBiases (active)
│   └── markdown.ts            # renderMarkdown + stripMarkdown
└── pages/
    ├── index.astro            # Uses loadAllBiases
    ├── biases/index.astro     # Uses loadAllBiases
    ├── biases/[...slug].astro # Uses loadAllBiases via getStaticPaths
    ├── biases/page/[page].astro # Uses loadAllBiases via paginate()
    ├── categories/index.astro # Uses loadAllBiases
    ├── categories/[category]/index.astro # Uses loadAllBiases
    └── categories/[category]/page/[page].astro
```

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

## Migration Steps

### Phase 1: Foundation (safe, doesn't break anything)

1. **Update `loaders/biases.ts`** to use Astro's Loader API correctly (return `id`, `data`, `body` per entry; already done partially)
2. **Update `content.config.ts`** to register the loader via `glob` API for Astro 5+
3. **Verify** `getCollection('biases')` returns the expected 61 entries
4. **Keep** `lib/biases.ts` as a shim that delegates to `getCollection()`

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
2. Delete old `loaders/biases.ts` (replaced by Astro Loader API version)
3. Update `src/integrations/llms.ts` to use new query helpers
4. Update `src/integrations/og-image.ts` similarly

### Risks

- **Slug generation**: Astro uses filename by default for `id`. Need to verify it matches our existing kebab-case slug logic (which strips spaces, lowercases).
- **Body rendering**: `entry.body` is raw markdown; we still need `renderMarkdown()` for HTML output.
- **Description metadata**: ensure our Zod schema parses `description` correctly (it's derived from `## Определение` section in our case, not from frontmatter).
- **Wiki-link rendering**: not part of Astro's default markdown pipeline for `.md` files loaded via custom loader — must keep `renderMarkdown()`.

### Estimated effort

- Phase 1: 1-2 hours
- Phase 2: 2-3 hours (one page at a time, easy to verify)
- Phase 3: 30 min

**Total: ~4-6 hours of focused work.**

## Out of scope

- Migrating the Astro markdown pipeline for inline JSX (not needed for this site — we use raw markdown rendering)
- Replacing `markdown.ts` entirely (it works; Content Collections doesn't change this)