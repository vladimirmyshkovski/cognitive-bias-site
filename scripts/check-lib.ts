/**
 * Self-checks for the parsing/rendering helpers.
 *
 *   CONTENT_PATH=~/content npm run check
 *
 * These cover the parts that are easy to break silently: the catalog cache,
 * wiki-link resolution and HTML escaping.
 */
import assert from 'node:assert/strict';
import { loadAllBiases, slugSet } from '../src/lib/biases.ts';
import { renderMarkdown, escapeHtml, unescapeHtml } from '../src/lib/markdown.ts';

const BASE = '/cognitive-bias-site/';
let failures = 0;

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${name}`);
    console.error(`      ${(err as Error).message.split('\n')[0]}`);
  }
}

const biases = await loadAllBiases();
const slugs = slugSet(biases);

console.log(`\nChecks (${biases.length} catalog entries)\n`);

// --- cache isolation ---------------------------------------------------------
await check('loadAllBiases returns an independent array on every call', async () => {
  const a = await loadAllBiases();
  const b = await loadAllBiases();
  assert.notEqual(a, b, 'same array instance returned twice');
  assert.equal(a.length, b.length);
});

await check('sorting one result does not reorder the next one', async () => {
  const first = await loadAllBiases();
  first.reverse();
  const second = await loadAllBiases();
  const isSorted = second.every(
    (b, i) => i === 0 || second[i - 1].title.localeCompare(b.title) <= 0
  );
  assert.ok(isSorted, 'cached order was mutated');
});

await check('every catalog entry parses', async () => {
  assert.ok(biases.length > 0);
  for (const b of biases) {
    assert.ok(b.slug && b.title && b.category, `incomplete entry: ${JSON.stringify(b)}`);
    assert.ok(slugs.has(b.slug));
  }
});

// --- wiki-link resolution ----------------------------------------------------
const render = (md: string) => renderMarkdown(md, BASE, slugs);

await check('unprefixed wiki-link to a catalog entry becomes a link', async () => {
  const html = await render('См. [[Anchoring]].');
  assert.ok(html.includes(`<a href="${BASE}biases/anchoring/">Anchoring</a>`), html);
});

await check('prefixed wiki-link becomes a link', async () => {
  const html = await render('См. [[ru/5. Каталог/Anchoring]].');
  assert.ok(html.includes(`<a href="${BASE}biases/anchoring/">Anchoring</a>`), html);
});

await check('prefixed wiki-link with alias keeps the alias as label', async () => {
  const html = await render('См. [[ru/5. Каталог/Decoy Effect|Decoy Effect]].');
  assert.ok(html.includes(`<a href="${BASE}biases/decoy-effect/">Decoy Effect</a>`), html);
});

await check('wiki-link outside the catalog stays plain italic text', async () => {
  const html = await render('См. [[Диалектическое и метафизическое мышление]].');
  assert.ok(html.includes('<span class="text-slate-500 italic">'), html);
  assert.ok(!html.includes('</a>'), 'must not produce a link');
});

await check('wiki-link to a non-existent entry does not produce a dead link', async () => {
  const html = await render('См. [[Not A Real Bias]].');
  assert.ok(!html.includes('/biases/not-a-real-bias/'), html);
});

await check('wiki-link with apostrophe matches the catalog slug', async () => {
  const html = await render("См. [[Gambler's Fallacy]].");
  assert.ok(html.includes(`<a href="${BASE}biases/gambler-s-fallacy/">`), html);
});

// --- escaping ----------------------------------------------------------------
await check('raw HTML in the source is escaped', async () => {
  const html = await render('Текст <script>alert(1)</script> конец.');
  assert.ok(!html.includes('<script>'), html);
  assert.ok(html.includes('&lt;script&gt;'), html);
});

await check('quotes in a link URL cannot break out of the href attribute', async () => {
  const html = await render('[клик](https://evil.test/"onmouseover="alert(1))');
  assert.ok(!html.includes('"onmouseover="'), html);
});

await check('escapeHtml escapes ampersands first', async () => {
  assert.equal(escapeHtml('a & <b> "c"'), 'a &amp; &lt;b&gt; &quot;c&quot;');
});

await check('unescapeHtml reverses escapeHtml', () => {
  const raw = 'Bias & "Heuristic" <x>';
  assert.equal(unescapeHtml(escapeHtml(raw)), raw);
});

// --- markdown basics ---------------------------------------------------------
await check('headings get an id and body text becomes a paragraph', async () => {
  const html = await render('## Заголовок\n\nТекст.');
  assert.ok(html.includes('<h2 id="заголовок">Заголовок</h2>'), html);
  assert.ok(html.includes('<p>Текст.</p>'), html);
});

console.log('');
if (failures > 0) {
  console.error(`${failures} check(s) failed\n`);
  process.exit(1);
}
console.log('All checks passed\n');
