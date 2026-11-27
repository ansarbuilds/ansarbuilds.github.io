// Redraws the project-page illustrations as dot-matrix prints, so every
// picture on the site shares the home page's language (square dots on
// stone, one cobalt). Each image is sampled on a square grid:
//   - light scenes: dark areas become ink dots on stone paper
//   - dark scenes:  light areas become paper dots on an obsidian plate
//   - bright cobalt stays cobalt, its dots sized by brightness so glows
//     break up instead of filling in
//
//   PW_CHANNEL=chrome [ONLY=<name>] node scripts/dot-matrix-art.mjs [--out <dir>]
//
// Sources are read from git at SOURCE_REF (the cobalt-recoloured 3D art),
// not from disk, so re-running never re-samples its own output. Writes over
// public/shots/... unless --out is given.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { DOT_ART as ALL } from './dot-matrix-files.mjs';

const SOURCE_REF = '63f92a0';
const CELLS = 110; // dots across; ~11px cells on the 1200px art

const root = resolve(import.meta.dirname, '..');
const outFlag = process.argv.indexOf('--out');
const outDir = outFlag > -1 ? resolve(process.argv[outFlag + 1]) : null;
if (outDir) mkdirSync(outDir, { recursive: true });

// ONLY=<name> renders just the matching files.
export const FILES = process.env.ONLY ? ALL.filter((f) => f.includes(process.env.ONLY)) : ALL;

// Per-image tuning for scenes that print muddy at the defaults:
// `floor` is the luminance percentile treated as black (a higher floor
// clears a dim background), `gamma` < 1 brightens the mid-tones.
const TUNING = {
  'agent-flight-recorder': { floor: 0.35, gamma: 0.8 },
  'rea-study': { floor: 0.3, gamma: 0.9 },
};

// Runs in the page: draws `img` as dot-matrix onto a canvas the same size.
async function draw({ src, cells, mime, floor = 0.03, gamma = 1.15 }) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const rows = Math.round((cells * H) / W);
  const sample = Object.assign(document.createElement('canvas'), { width: cells, height: rows });
  const sx = sample.getContext('2d');
  sx.imageSmoothingQuality = 'high';
  sx.drawImage(img, 0, 0, cells, rows);
  const d = sx.getImageData(0, 0, cells, rows).data;

  const L = [];
  for (let i = 0; i < d.length; i += 4) L.push((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255);
  const sorted = [...L].sort((a, b) => a - b);
  const lo = sorted[Math.floor(L.length * floor)], hi = sorted[Math.floor(L.length * 0.985)];
  const dark = sorted[Math.floor(L.length * 0.5)] < 0.45;

  const out = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const x = out.getContext('2d');
  const step = W / cells;
  x.fillStyle = dark ? '#111318' : '#f4f3ef';
  x.fillRect(0, 0, W, H);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cells; i++) {
      const k = j * cells + i;
      const l = Math.min(1, Math.max(0, (L[k] - lo) / Math.max(0.05, hi - lo)));
      const ink = Math.pow(dark ? l : 1 - l, gamma);
      const r = d[k * 4], g = d[k * 4 + 1], b = d[k * 4 + 2];
      const max = Math.max(r, g, b), sat = max ? (max - Math.min(r, g, b)) / max : 0;
      const blue = b > r * 1.4 && b > g * 1.1 && sat > 0.45 && max > 120;
      const size = blue ? step * (0.25 + 0.65 * (max / 255)) : step * 0.92 * ink;
      if (size < step * 0.14) continue;
      x.fillStyle = blue
        ? (dark ? 'rgb(98 140 255)' : 'rgb(29 78 216)')
        : dark ? `rgb(244 243 239 / ${(0.3 + 0.65 * ink).toFixed(2)})` : `rgb(17 19 24 / ${(0.35 + 0.6 * ink).toFixed(2)})`;
      x.fillRect(i * step + (step - size) / 2, j * step + (step - size) / 2, size, size);
    }
  }
  return out.toDataURL(mime, 0.72).split(',')[1];
}

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const tab = await browser.newPage();
for (const file of FILES) {
  const ext = extname(file).slice(1);
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const bytes = execFileSync('git', ['show', `${SOURCE_REF}:portfolio/public/${file}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  const src = `data:${mime};base64,${bytes.toString('base64')}`;
  const encoded = await tab.evaluate(draw, { src, cells: CELLS, mime, ...TUNING[basename(file, `.${ext}`)] });
  const target = outDir ? resolve(outDir, basename(file)) : resolve(root, 'public', file);
  writeFileSync(target, Buffer.from(encoded, 'base64'));
  console.log(`dot-matrix ${file}`);
}
await browser.close();
