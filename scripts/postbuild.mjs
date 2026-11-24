/**
 * Post-build step — prepares dist/anne-portfolio/browser for GitHub Pages.
 *
 *  - <base href>: set from the path of the "Website address" CMS setting, so the
 *    same build works at a domain root (https://anne.art → "/") or under a
 *    project path (https://name.github.io/anne-portfolio → "/anne-portfolio/").
 *    All asset and image URLs are relative, so they follow the base.
 *  - 404.html: a copy of the prerendered home page, so mistyped or old links
 *    still land on the site (the app redirects unknown paths to the home page).
 *  - .nojekyll: stops GitHub's Jekyll step from hiding files that start with "_"
 *    (e.g. _img, _files) when deploying from a branch.
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'dist/anne-portfolio/browser');
const index = join(out, 'index.html');

try {
  await access(index);
} catch {
  console.error(`✖ ${index} not found — did the prerender step run?`);
  process.exit(1);
}

const content = JSON.parse(await readFile(join(root, 'src/app/core/generated/content.json'), 'utf8'));
let basePath = '/';
try {
  basePath = new URL(content.site.url).pathname.replace(/\/*$/, '/');
} catch {
  // No or invalid Website address: build-content already warned; serve from the root.
}

const html = (await readFile(index, 'utf8')).replace(/<base href="[^"]*"\s*\/?>/, `<base href="${basePath}">`);
if (!html.includes(`<base href="${basePath}">`)) {
  console.error('✖ Could not find <base href> in index.html');
  process.exit(1);
}

await writeFile(index, html);
await writeFile(join(out, '404.html'), html);
await writeFile(join(out, '.nojekyll'), '');
console.log(`✔ Post-build: base href "${basePath}", 404.html and .nojekyll written`);
