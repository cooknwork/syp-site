// Next.js writes absolute asset paths (/_next/...). The preview is served from a sub-path,
// so we rewrite them to relative ones. Only used for the test link, not for production hosting.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';

const root = process.argv[2] || 'out';
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

for (const file of walk(root)) {
  const rel = relative(root, file);
  const depth = dirname(rel) === '.' ? 0 : dirname(rel).split(sep).length;
  const up = depth ? '../'.repeat(depth) : './';
  if (/\.(html|css)$/.test(file)) {
    const src = readFileSync(file, 'utf8');
    const out = src.replace(/(["'(=\s])\/_next\//g, `$1${up}_next/`);
    if (out !== src) writeFileSync(file, out);
  } else if (/\.js$/.test(file)) {
    // webpack public path used to load code chunks: resolve against the page, not the domain root
    const src = readFileSync(file, 'utf8');
    const out = src.replace(/(["'])\/_next\/(["'])/g, '$1./_next/$2');
    if (out !== src) writeFileSync(file, out);
  }
}
console.log('preview paths prepared in', root);
