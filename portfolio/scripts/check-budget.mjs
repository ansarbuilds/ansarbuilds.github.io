// Fails the build when the first load or the shipped media grows past its
// budget. Run after `npm run build`. "First load" is what index.html asks
// for before anything is clicked: its script, preloaded chunks and CSS.
//
// First-load JS is about 87 kB gzipped: React 57, the home page and the
// light field 26, icons 4. Framer Motion and the full project stories load
// only with the older write-ups that use them. The budget keeps that line
// with some room; the launch film is gone, so all of dist sits near 27 MB.
import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const KB = 1000;
const MB = 1000 * KB;
const BUDGET = {
  'first-load JS (gzip)': 110 * KB,
  'first-load CSS (gzip)': 20 * KB,
  'preloaded fonts': 60 * KB,
  'largest file in dist': 7 * MB,
  'all of dist': 30 * MB,
};

const dist = resolve('dist');
const html = await readFile(join(dist, 'index.html'), 'utf8');
const refs = (pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
const gzipSize = async (path) => gzipSync(await readFile(join(dist, path))).length;
const sum = async (paths, size) => (await Promise.all(paths.map(size))).reduce((a, b) => a + b, 0);

const scripts = [...new Set([...refs(/<script[^>]+src="([^"]+)"/g), ...refs(/<link rel="modulepreload"[^>]+href="([^"]+)"/g)])];
const styles = refs(/<link rel="stylesheet"[^>]+href="([^"]+)"/g);
const fonts = refs(/<link rel="preload" as="font"[^>]+href="([^"]+)"/g);
if (!scripts.length || !styles.length) throw new Error('check-budget: no scripts or styles found in dist/index.html');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : stat(join(dir, entry.name)).then(({ size }) => [{ path: join(dir, entry.name).slice(dist.length), size }]))))).flat();
}
const files = await walk(dist);
const largest = files.reduce((a, b) => (b.size > a.size ? b : a));

const measured = {
  'first-load JS (gzip)': await sum(scripts, gzipSize),
  'first-load CSS (gzip)': await sum(styles, gzipSize),
  'preloaded fonts': await sum(fonts, async (path) => (await stat(join(dist, path))).size),
  'largest file in dist': largest.size,
  'all of dist': files.reduce((total, file) => total + file.size, 0),
};

const show = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${(bytes / KB).toFixed(1)} kB`);
let failed = false;
for (const [name, limit] of Object.entries(BUDGET)) {
  const over = measured[name] > limit;
  failed ||= over;
  console.log(`${over ? 'OVER' : 'ok  '}  ${name.padEnd(24)} ${show(measured[name]).padStart(9)} / ${show(limit)}${name === 'largest file in dist' ? `  (${largest.path})` : ''}`);
}
if (failed) { console.error('\nOver budget. Shrink it, or raise the budget in scripts/check-budget.mjs with a reason.'); process.exit(1); }
