import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'content');
const dest = path.join(root, 'public', 'content');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

if (existsSync(dest)) rmSync(dest, { recursive: true });

let count = 0;
if (existsSync(src)) {
  for (const file of walk(src)) {
    if (file.endsWith('.md')) continue;
    const target = path.join(dest, path.relative(src, file));
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(file, target);
    count++;
  }
}
console.log(`sync-content-assets: copied ${count} file(s) to public/content`);
