// Runs after `expo export --platform web`. Removes files that must not be
// published and fails the build if any page breaks the public/private rules.
import { readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const { prefixes: privatePrefixes } = JSON.parse(
  readFileSync(new URL('../content/private-routes.json', import.meta.url), 'utf8'),
);

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

// 1. Remove Expo's dev route index and unfilled dynamic-route shells.
for (const file of htmlFiles(dist)) {
  const rel = relative(dist, file);
  if (rel === '_sitemap.html' || /\[[^\]]+\]/.test(rel)) {
    rmSync(file);
    console.log(`removed ${rel}`);
  }
}

// 2. Verify each remaining page.
const errors = [];
const toRoute = (rel) =>
  '/' + rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '').replace(/\/$/, '');

for (const file of htmlFiles(dist)) {
  const rel = relative(dist, file);
  const route = toRoute(rel);
  const html = readFileSync(file, 'utf8');
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
  const noindex = /<meta[^>]*name="robots"[^>]*noindex/.test(head);
  const canonical = /<link[^>]*rel="canonical"/.test(head);
  const isPrivate = privatePrefixes.some((p) => route === p || route.startsWith(p + '/'));
  const isUtility = rel === '+not-found.html';

  const h1s = html.match(/<h1\b/g)?.length ?? 0;
  if (h1s !== 1) errors.push(`${rel}: expected exactly one <h1>, found ${h1s}`);

  if (isPrivate || isUtility) {
    if (!noindex) errors.push(`${rel}: app-only page must be noindex`);
    if (canonical) errors.push(`${rel}: app-only page must not have a canonical URL`);
  } else {
    if (noindex) errors.push(`${rel}: public page is noindex`);
    if (!canonical) errors.push(`${rel}: public page has no canonical URL`);
    if (!/<meta[^>]*name="description"/.test(head)) errors.push(`${rel}: missing meta description`);
    // The answer must be in the HTML itself, as the first paragraph after the H1.
    if (!/<\/h1><p\b[^>]*>[^<]{20,}/.test(html)) errors.push(`${rel}: no text paragraph directly after the <h1>`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('postexport: all pages pass');
