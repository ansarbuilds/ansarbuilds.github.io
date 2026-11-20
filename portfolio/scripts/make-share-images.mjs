// Renders the link-preview cards (1200x630) in the film's look: carbon, bone,
// one coral, the site's own fonts. Only copy that is already on the site:
// the hero's line and proof numbers for the site card; each project's kind,
// headline and stats for its card.
//
//   node scripts/make-share-images.mjs
//
// Writes public/og-image.png and public/p/<slug>/og.jpg for every listed
// project except saywhen, whose card is a designed product shot that its own
// share page (/p/saywhen/) also uses.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LISTED_PROJECTS } from '../src/data/projects.js';
import { FLAGSHIPS } from '../src/data/showcase.js';
import { HERO } from '../src/data/content.js';

const root = resolve(import.meta.dirname, '..');
const font = (file) => `data:font/woff2;base64,${readFileSync(resolve(root, 'src/assets/fonts', file)).toString('base64')}`;
const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KEEP = new Set(['saywhen']);

const CSS = `
@font-face { font-family: Anton; src: url(${font('anton-latin-400-normal.woff2')}); }
@font-face { font-family: Mono; src: url(${font('jetbrains-mono-latin-wght-normal.woff2')}); font-weight: 100 900; }
@font-face { font-family: Body; src: url(${font('outfit-latin-wght-normal.woff2')}); font-weight: 100 900; }
@font-face { font-family: Serif; font-style: italic; src: url(${font('instrument-serif-latin-400-italic.woff2')}); }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: #0c0a09; color: #efe6d8; font-family: Body; }
body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(70% 90% at 88% 10%, rgb(255 138 95 / .2), transparent 62%), radial-gradient(60% 60% at 0% 100%, rgb(255 138 95 / .07), transparent 70%); }
body::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: #ff8a5f; }
.top { position: absolute; left: 64px; right: 64px; top: 52px; display: flex; justify-content: space-between; font: 500 17px/1 Mono; letter-spacing: .16em; text-transform: uppercase; color: rgb(239 230 216 / .62); }
.top b { color: #ff8a5f; font-weight: 500; max-width: 760px; text-align: right; white-space: nowrap; font-size: 15px; }
.foot { position: absolute; left: 64px; right: 64px; bottom: 44px; display: flex; justify-content: space-between; font: 500 17px/1 Mono; letter-spacing: .12em; text-transform: uppercase; color: rgb(239 230 216 / .62); }
.big { font-family: Anton; text-transform: uppercase; line-height: .9; letter-spacing: .005em; }
.outline { color: transparent; -webkit-text-stroke: 2.5px #ff8a5f; }
.stats { position: absolute; left: 64px; right: 64px; bottom: 104px; display: flex; gap: 56px; }
.stats div { border-top: 1px solid rgb(239 230 216 / .2); padding-top: 16px; min-width: 200px; }
.stats b { display: block; font: 400 54px/1 Anton; color: #efe6d8; }
.stats span { display: block; margin-top: 10px; font: 500 15px/1.3 Mono; letter-spacing: .08em; text-transform: uppercase; color: rgb(239 230 216 / .62); max-width: 300px; }
`;
const page = (body) => `<!doctype html><html><head><style>${CSS}</style></head><body>${body}</body></html>`;

// The first sentence of a hook, for projects without a stage headline.
const firstSentence = (text) => (text.match(/^[^.!?]+[.!?]/) || [text])[0].trim();
const titleSize = (title) => (title.length <= 9 ? 150 : title.length <= 16 ? 118 : title.length <= 24 ? 92 : 74);

// The site card: the hero's name, its line and its four proof cards.
const proof = FLAGSHIPS.slice(0, 4).map((flag) => {
  const project = LISTED_PROJECTS.find((p) => p.slug === flag.slug);
  return { value: flag.stats[0][0], label: project?.title.replace(/^My Take on /, '') ?? flag.slug };
});
const site = page(`
  <p class="top"><span>Mohamed Ansar · Index of work</span><b>Agents · AI studies · apps</b></p>
  <h1 class="big" style="position:absolute;left:64px;top:104px;font-size:128px">Mohamed<br><span class="outline">Ansar</span></h1>
  <p style="position:absolute;left:64px;top:348px;font:500 30px/1.25 Body;max-width:1080px">${escape(HERO.title)} <em style="font:italic 400 1.12em Serif;color:#ff8a5f;white-space:nowrap">Here are ${LISTED_PROJECTS.length} of them.</em></p>
  <div class="stats" style="bottom:52px;gap:40px">${proof.map((p) => `<div style="min-width:240px"><b style="font-size:46px">${escape(p.value)}</b><span>${escape(p.label)}</span></div>`).join('')}</div>`);

const projectCard = (project) => {
  const flag = FLAGSHIPS.find((item) => item.slug === project.slug);
  const line = flag?.headline || firstSentence(project.hook);
  const stats = (project.stats?.length ? project.stats.map((s) => [s.value, s.short || s.label]) : flag?.stats || []).slice(0, 3);
  const title = project.title;
  return page(`
    <p class="top"><span>Mohamed Ansar · Selected work</span><b>${escape(project.kind)}</b></p>
    <h1 class="big" style="position:absolute;left:64px;top:118px;right:64px;font-size:${titleSize(title)}px">${escape(title)}</h1>
    <p style="position:absolute;left:64px;top:${118 + titleSize(title) * (title.length > 24 ? 1.85 : 1) + 28}px;font:500 30px/1.3 Body;max-width:960px;color:rgb(239 230 216 / .88)">${escape(line)}</p>
    ${stats.length ? `<div class="stats">${stats.map(([value, label]) => `<div><b>${escape(value)}</b><span>${escape(label)}</span></div>`).join('')}</div>` : ''}
    <p class="foot"><span>ansarbuilds.dev/work/${escape(project.slug)}</span><span>Case study</span></p>`);
};

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const render = async (html, path, type) => {
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path, type, ...(type === 'jpeg' ? { quality: 88 } : {}) });
  console.log(`wrote ${path.replace(root + '/', '')}`);
};
await render(site, resolve(root, 'public/og-image.png'), 'png');
for (const project of LISTED_PROJECTS) {
  if (KEEP.has(project.slug)) continue;
  mkdirSync(resolve(root, 'public/p', project.slug), { recursive: true });
  await render(projectCard(project), resolve(root, 'public/p', project.slug, 'og.jpg'), 'jpeg');
}
await browser.close();
