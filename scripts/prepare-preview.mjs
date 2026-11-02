// Prepares the static export for the test link (not used for production hosting):
//  1. absolute asset paths (/_next/...) become relative, because the preview is served from a sub-path;
//  2. the `_next` folder is renamed to `assets`, because the preview host reserves names starting with "_".
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const root = process.argv[2] || 'out';
const DIR = 'assets';

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

if (existsSync(join(root, '_next'))) renameSync(join(root, '_next'), join(root, DIR));

for (const file of walk(root)) {
  const rel = relative(root, file);
  const depth = dirname(rel) === '.' ? 0 : dirname(rel).split(sep).length;
  const up = depth ? '../'.repeat(depth) : './';
  let src;
  if (/\.(html|css|txt)$/.test(file)) {
    src = readFileSync(file, 'utf8');
    const out = src
      .replace(/(["'(=\s,])\/_next\//g, `$1${up}${DIR}/`)
      .replace(/(["'(=\s,])(\.\.?\/(?:\.\.\/)*)_next\//g, `$1$2${DIR}/`);
    if (out !== src) writeFileSync(file, out);
  } else if (/\.js$/.test(file)) {
    // webpack public path for code chunks: resolve against the page, not the domain root
    src = readFileSync(file, 'utf8');
    const out = src
      .replace(/(["'])\/_next\/(["'])/g, `$1./${DIR}/$2`)
      .replace(/(["'])\.\/_next\/(["'])/g, `$1./${DIR}/$2`);
    if (out !== src) writeFileSync(file, out);
  }
}

const left = walk(root).filter((f) => /\.(html|css|js)$/.test(f) && /["'(]\.{0,2}\/?_next\//.test(readFileSync(f, 'utf8')));
console.log('preview prepared in', root, left.length ? `— still referencing _next: ${left.join(', ')}` : '');
