// Renders the four "More shipped work" card images (public/shots/more/*.webp, 16:9 like the cards)
// from each project's own evidence, in the film's look: carbon, bone, one
// coral, the site's own fonts. Only facts already on the site are drawn.
//
//   node scripts/make-more-art.mjs
//
// Each frame is screenshotted, then encoded to WebP by the browser itself.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const font = (file) => `data:font/woff2;base64,${readFileSync(resolve(root, 'src/assets/fonts', file)).toString('base64')}`;
const icon = `data:image/webp;base64,${readFileSync(resolve(root, 'public/shots/reptrack-icon.webp')).toString('base64')}`;
const out = resolve(root, 'public/shots/more');
mkdirSync(out, { recursive: true });

const CSS = `
@font-face { font-family: Anton; src: url(${font('anton-latin-400-normal.woff2')}); }
@font-face { font-family: Mono; src: url(${font('jetbrains-mono-latin-wght-normal.woff2')}); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1600px; height: 900px; overflow: hidden; background: #0c0a09; color: #efe6d8; font-family: Mono; position: relative; }
body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(80% 70% at 70% 30%, rgb(255 138 95 / .14), transparent 70%); }
.label { position: absolute; right: 72px; top: 64px; text-align: right; font-size: 20px; letter-spacing: .18em; text-transform: uppercase; color: #ff8a5f; }
.cap { position: absolute; left: 72px; bottom: 64px; font-size: 22px; letter-spacing: .04em; color: rgb(239 230 216 / .7); }
.big { font-family: Anton; text-transform: uppercase; line-height: .9; }
`;
const page = (body) => `<!doctype html><html><head><style>${CSS}</style></head><body>${body}</body></html>`;

// Jev: on the messages saved for the final test, the best small model
// chose the right team for 80% (the hook in projects.js). Drawn per 100.
const dots = Array.from({ length: 100 }, (_, i) => `<i style="background:${i < 80 ? '#ff8a5f' : 'rgb(239 230 216 / .16)'}"></i>`).join('');
const jev = page(`<p class="label">Final test · per 100 messages</p>
<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);display:grid;grid-template-columns:repeat(20,48px);gap:18px">${dots}</div>
<style>i{display:block;width:48px;height:48px;border-radius:50%}</style>
<p class="cap">Coral: sent to the right team by a small free model</p>`);

// REA: cost per run as the tool reports it (report figure 6, development runs).
const bars = [['Ordinary tools only', 0.088], ['With REA, left alone', 0.14], ['With REA, told to use it', 0.204]];
const rea = page(`<p class="label">Cost per run · report figure 6</p>
<div style="position:absolute;left:160px;right:160px;top:50%;transform:translateY(-52%);display:grid;gap:40px">${bars.map(([name, v], i) => `
  <div><p style="font-size:22px;color:rgb(239 230 216 / .75);margin-bottom:12px">${name}</p>
  <div style="display:flex;align-items:center;gap:24px"><span style="display:block;height:64px;width:${Math.round((v / 0.204) * 960)}px;border-radius:8px;background:${i === 2 ? '#ff8a5f' : i === 1 ? 'rgb(255 138 95 / .45)' : 'rgb(239 230 216 / .22)'}"></span>
  <b class="big" style="font-size:60px">$${v.toFixed(3)}</b></div></div>`).join('')}
</div>
<p class="cap">More cost, no clear gain in the answers</p>`);

// StoryEra: the 53 chapters of the first audit, and its five steps.
// One equal mark per chapter: the heights carry no data.
const ticks = Array.from({ length: 53 }, () => '<i></i>').join('');
const steps = ['Scope', 'Read', 'Ledger', 'Reconcile', 'Report'];
const story = page(`<p class="label">Continuity audit · 53 chapters</p>
<div style="position:absolute;left:160px;right:160px;top:200px;height:240px;display:flex;align-items:flex-end;gap:10px">${ticks}</div>
<style>i{flex:1;height:200px;background:linear-gradient(#ff8a5f, rgb(255 138 95 / .2));border-radius:3px}</style>
<div style="position:absolute;left:160px;right:160px;top:500px;display:flex;justify-content:space-between">${steps.map((s, i) => `<div><p style="font-size:20px;color:#ff8a5f">0${i + 1}</p><p class="big" style="font-size:64px;margin-top:10px">${s}</p></div>`).join('')}</div>
<p class="cap">The author decides what becomes canon</p>`);

// RepTrack: the app's own icon.
const rep = page(`<p class="label">Native Swift · App Store</p>
<img src="${icon}" style="position:absolute;left:50%;top:44%;width:360px;height:360px;transform:translate(-50%,-50%);border-radius:76px;box-shadow:0 60px 120px -30px rgb(0 0 0 / .9), 0 0 0 1px rgb(239 230 216 / .12)">
<p class="big" style="position:absolute;left:0;right:0;top:690px;text-align:center;font-size:72px">RepTrack</p>
<p class="cap">A workout log for the gym floor</p>`);

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const [slug, html] of [['decision-models', jev], ['rea-study', rea], ['storyera', story], ['reptrack', rep]]) {
  await tab.setContent(html);
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
