// Moves the illustrated project art from the old film palette (cream paper,
// one coral) to the site's Cobalt & Stone palette, without redrawing it:
// saturated warm pixels (the coral accent) turn cobalt, and the warm cream
// and brown neutrals are cooled toward stone. Shapes, light and shadow stay.
//
//   PW_CHANNEL=chrome node scripts/recolor-art.mjs [--out <dir>]
//
// Writes over the files in place unless --out is given (handy for review).
// Photographic art is left out on purpose: the solar system's sun and the
// star field are meant to be warm. The originals live in git history.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outFlag = process.argv.indexOf('--out');
const outDir = outFlag > -1 ? resolve(process.argv[outFlag + 1]) : null;
if (outDir) mkdirSync(outDir, { recursive: true });

export const FILES = [
  'shots/refined/agent-flight-recorder.webp',
  'shots/refined/analytics-assistant.webp',
  'shots/refined/authorized-web-exposure-audit.webp',
  'shots/refined/catalogue-checker.webp',
  'shots/refined/data-delivery.webp',
  'shots/refined/decision-models.webp',
  'shots/refined/emet.webp',
  'shots/refined/haloscript.webp',
  'shots/refined/integration.webp',
  'shots/refined/jarvis.webp',
  'shots/refined/rea-study.webp',
  'shots/refined/reptrack.webp',
  'shots/refined/site-recon.webp',
  'shots/refined/sitescout.webp',
  'shots/refined/storyera.webp',
  'shots/spotlight/prh-jepa.jpg',
];

// Runs in the page. Cobalt is the site's --at-cobalt (#1d4ed8, hue ~224°).
function recolor(data) {
  const hsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    let h = 0;
    if (d) {
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max];
  };
  const rgb = (h, s, v) => {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const [h, s, v] = hsv(p[i], p[i + 1], p[i + 2]);
    if (!(h <= 48 || h >= 340)) continue; // only warm pixels move
    let out;
    if (s > 0.32) {
      // Coral accent -> cobalt, blended in over a short ramp so edges stay soft.
      const t = Math.min(1, (s - 0.32) / 0.2);
      const to = rgb(224, Math.min(1, s * 0.95 + 0.05), v * 0.86);
      const from = rgb(h, s * 0.15, v);
      out = from.map((f, k) => f + (to[k] - f) * t);
    } else {
      // Cream and brown neutrals -> cooler stone.
      out = rgb(h, s * 0.35, v);
    }
    p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2];
  }
  return data;
}

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const tab = await browser.newPage();
for (const file of FILES) {
  const path = resolve(root, 'public', file);
  const ext = extname(file).slice(1);
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const src = `data:${mime};base64,${readFileSync(path).toString('base64')}`;
  const encoded = await tab.evaluate(async ({ src, mime, fn }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const recolorFn = new Function(`return (${fn})`)();
    ctx.putImageData(recolorFn(ctx.getImageData(0, 0, canvas.width, canvas.height)), 0, 0);
    return canvas.toDataURL(mime, 0.8).split(',')[1];
  }, { src, mime, fn: recolor.toString() });
  const target = outDir ? resolve(outDir, `${basename(file)}`) : path;
  writeFileSync(target, Buffer.from(encoded, 'base64'));
  console.log(`recolored ${file}${outDir ? ` -> ${target}` : ''}`);
}
await browser.close();
