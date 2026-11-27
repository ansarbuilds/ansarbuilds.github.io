// Renders the four "More shipped work" card images (public/shots/more/*.webp, 16:9 like the cards)
// from each project's own evidence, in the site's Cobalt & Stone look: stone
// paper with the faint drafting grid, obsidian ink, one cobalt, the site's
// own fonts (Space Grotesk, IBM Plex Mono). Only facts already on the site are drawn.
//
//   node scripts/make-more-art.mjs
//
// Each frame is screenshotted, then encoded to WebP by the browser itself.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const icon = `data:image/webp;base64,${readFileSync(resolve(root, 'public/shots/reptrack-icon.webp')).toString('base64')}`;
const out = resolve(root, 'public/shots/more');
mkdirSync(out, { recursive: true });

// Site tokens (src/index.css): --at-stone, --at-obsidian, --at-muted, --at-cobalt.
const STONE = '#f4f3ef', INK = '#111318', MUTED = '#4b5262', COBALT = '#1d4ed8';
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">';
const CSS = `
* { margin: 0; box-sizing: border-box; }
body { width: 1600px; height: 900px; overflow: hidden; background: ${STONE}; color: ${INK}; font-family: "IBM Plex Mono", monospace; position: relative;
  background-image: linear-gradient(rgb(17 19 24 / .05) 1px, transparent 1px), linear-gradient(90deg, rgb(17 19 24 / .05) 1px, transparent 1px); background-size: 64px 64px; }
body::after { content: ""; position: absolute; inset: 40px; border: 1px solid rgb(17 19 24 / .14); pointer-events: none; }
.label { position: absolute; right: 72px; top: 64px; text-align: right; font-size: 20px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; color: ${COBALT}; }
.cap { position: absolute; left: 72px; bottom: 64px; font-size: 22px; letter-spacing: .02em; color: ${MUTED}; }
.big { font-family: "Space Grotesk", sans-serif; font-weight: 600; letter-spacing: -.02em; line-height: .95; }
`;
const page = (body) => `<!doctype html><html><head>${FONTS}<style>${CSS}</style></head><body>${body}</body></html>`;

// Jev: on the messages saved for the final test, the best small model
// chose the right team for 80% (the hook in projects.js). Drawn per 100.
const dots = Array.from({ length: 100 }, (_, i) => `<i style="background:${i < 80 ? COBALT : 'rgb(17 19 24 / .1)'}"></i>`).join('');
const jev = page(`<p class="label">Final test · per 100 messages</p>
<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);display:grid;grid-template-columns:repeat(20,48px);gap:18px">${dots}</div>
<style>i{display:block;width:48px;height:48px}</style>
<p class="cap">Blue: sent to the right team by a small free model</p>`);

// REA: cost per run as the tool reports it (report figure 6, development runs).
const bars = [['Ordinary tools only', 0.088], ['With REA, left alone', 0.14], ['With REA, told to use it', 0.204]];
const rea = page(`<p class="label">Cost per run · report figure 6</p>
<div style="position:absolute;left:160px;right:160px;top:50%;transform:translateY(-52%);display:grid;gap:40px">${bars.map(([name, v], i) => `
  <div><p style="font-size:22px;color:${MUTED};margin-bottom:12px">${name}</p>
  <div style="display:flex;align-items:center;gap:24px"><div style="position:relative;width:960px;height:64px;background:repeating-linear-gradient(135deg, rgb(17 19 24 / .12) 0 2px, transparent 2px 9px)"><span style="position:absolute;left:0;top:0;bottom:0;width:${Math.round((v / 0.204) * 960)}px;background:${i === 2 ? COBALT : i === 1 ? 'rgb(29 78 216 / .4)' : 'rgb(17 19 24 / .16)'}"></span></div>
  <b class="big" style="font-size:60px">$${v.toFixed(3)}</b></div></div>`).join('')}
</div>
<p class="cap">More cost, no clear gain in the answers</p>`);

// StoryEra: the 53 chapters of the first audit, and its five steps.
// One equal mark per chapter: the heights carry no data.
// Each chapter is one column of square dots, like a dot-matrix readout.
const ticks = Array.from({ length: 53 }, () => `<i>${'<b></b>'.repeat(9)}</i>`).join('');
const steps = ['Scope', 'Read', 'Ledger', 'Reconcile', 'Report'];
const story = page(`<p class="label">Continuity audit · 53 chapters</p>
<div style="position:absolute;left:160px;right:160px;top:200px;height:240px;display:flex;align-items:flex-end;gap:7px">${ticks}</div>
<style>i{flex:1;display:grid;gap:6px}i b{display:block;aspect-ratio:1;background:${COBALT}}i b:nth-child(n+6){opacity:.55}i b:nth-child(n+8){opacity:.25}</style>
<div style="position:absolute;left:160px;right:160px;top:500px;display:flex;justify-content:space-between">${steps.map((s, i) => `<div><p style="font-size:20px;color:${COBALT}">0${i + 1}</p><p class="big" style="font-size:64px;margin-top:10px">${s}</p></div>`).join('')}</div>
<p class="cap">The author decides what becomes canon</p>`);

// RepTrack: the app's own icon.
const rep = page(`<p class="label">Native Swift · App Store</p>
<img src="${icon}" style="position:absolute;left:50%;top:44%;width:360px;height:360px;transform:translate(-50%,-50%);border-radius:76px;box-shadow:0 50px 100px -40px rgb(17 19 24 / .45), 0 0 0 1px rgb(17 19 24 / .12)">
<p class="big" style="position:absolute;left:0;right:0;top:690px;text-align:center;font-size:72px">RepTrack</p>
<p class="cap">A workout log for the gym floor</p>`);

// PW_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own download.
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const tab = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const [slug, html] of [['decision-models', jev], ['rea-study', rea], ['storyera', story], ['reptrack', rep]]) {
  await tab.setContent(html, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  const png = (await tab.screenshot()).toString('base64');
  const webp = await tab.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/webp', 0.82).split(',')[1];
  }, png);
  writeFileSync(resolve(out, `${slug}.webp`), Buffer.from(webp, 'base64'));
  console.log(`wrote shots/more/${slug}.webp`);
}
await browser.close();
