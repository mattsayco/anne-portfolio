/**
 * Post-build step — prepares dist/anne-portfolio/browser for GitHub Pages.
 *
 *  - 404.html: a copy of the prerendered home page, so mistyped or old links
 *    still land on the site (the app redirects unknown paths to "/").
 *  - .nojekyll: stops GitHub's Jekyll step from hiding files that start with "_"
 *    (e.g. /_img, /_files) when deploying from a branch.
 */
import { copyFile, writeFile, access } from 'node:fs/promises';
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

await copyFile(index, join(out, '404.html'));
await writeFile(join(out, '.nojekyll'), '');
console.log('✔ Post-build: 404.html and .nojekyll written');
