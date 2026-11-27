// Moves the pre-rendered intro film (public/film/*.mp4 and its posters) from
// the old warm palette to Cobalt & Stone, without re-rendering it: a 3D LUT
// built from the same mapping as recolor-art.mjs is applied by ffmpeg.
//   - coral, orange, amber and gold  -> cobalt (a brighter cobalt than on
//     stone, so type stays readable on the film's dark ground)
//   - warm brown-black grounds       -> cool obsidian
//   - the purple backdrop            -> deep cobalt
//   - Hedwig's cyan is left as it is
//
//   node scripts/recolor-film.mjs [--out <dir>] [--lut-only]
//
// Needs ffmpeg on PATH. Writes over public/film unless --out is given.
// Re-running on already recoloured files is close to a no-op, but start from
// the originals in git history if you change the mapping.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const outDir = arg('--out') ? resolve(arg('--out')) : resolve(root, 'public/film');
mkdirSync(outDir, { recursive: true });

const COBALT_HUE = 224; // --at-cobalt #1d4ed8

const hsv = (r, g, b) => {
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
  return [r + m, g + m, b + m];
};
const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
const ramp = (x, lo, hi) => Math.max(0, Math.min(1, (x - lo) / (hi - lo)));

// One colour in, one colour out, all channels 0..1.
export function mapColor(r, g, b) {
  const [h, s, v] = hsv(r, g, b);
  const warm = h <= 62 || h >= 335;
  if (warm) {
    const neutral = rgb(h, s * 0.3, v);
    // Saturated warm -> cobalt, with a soft ramp so gradients and glows don't band.
    const t = ramp(s, 0.28, 0.5);
    const lift = 0.94 + 0.06 * v; // keep highlights bright on dark ground
    const cobalt = rgb(COBALT_HUE, Math.min(0.88, s * 0.9 + 0.05), Math.min(1, v * lift));
    return mix(neutral, cobalt, t);
  }
  if (h >= 255 && h < 335 && s > 0.15) {
    // Purple / magenta grounds -> deep cobalt, fading in with saturation.
    const t = ramp(s, 0.15, 0.35);
    return mix([r, g, b], rgb(COBALT_HUE + 4, s * 0.85, v * 0.92), t);
  }
  return [r, g, b];
}

// Build a 33-point .cube LUT (red varies fastest, as the format requires).
const N = 33;
const lines = ['TITLE "cobalt-stone film"', `LUT_3D_SIZE ${N}`, 'DOMAIN_MIN 0 0 0', 'DOMAIN_MAX 1 1 1'];
for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
  const out = mapColor(ri / (N - 1), gi / (N - 1), bi / (N - 1));
  lines.push(out.map((c) => Math.max(0, Math.min(1, c)).toFixed(6)).join(' '));
}
const lut = resolve(tmpdir(), 'cobalt-stone-film.cube');
writeFileSync(lut, lines.join('\n') + '\n');
console.log(`wrote ${lut}`);
if (process.argv.includes('--lut-only')) process.exit(0);

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], { stdio: 'inherit' });
const filter = `lut3d=file='${lut}':interp=tetrahedral`;
const src = (name) => resolve(root, 'public/film', name);
const tmp = (name) => resolve(tmpdir(), `cobalt-${name}`);

// Keep each cut near its original bitrate so the page weight doesn't move.
for (const [name, kbps] of [['film-wide.mp4', 680], ['film-upright.mp4', 585]]) {
  ff(['-i', src(name), '-vf', filter, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-b:v', `${kbps}k`, '-maxrate', `${kbps * 2}k`, '-bufsize', `${kbps * 4}k`, '-preset', 'slow',
    '-c:a', 'copy', '-movflags', '+faststart', tmp(name)]);
  execFileSync('mv', [tmp(name), resolve(outDir, name)]);
  console.log(`recolored film/${name}`);
}
for (const name of ['film-wide-poster.jpg', 'film-upright-poster.jpg']) {
  ff(['-i', src(name), '-vf', filter, '-q:v', '3', tmp(name)]);
  execFileSync('mv', [tmp(name), resolve(outDir, name)]);
  console.log(`recolored film/${name}`);
}
