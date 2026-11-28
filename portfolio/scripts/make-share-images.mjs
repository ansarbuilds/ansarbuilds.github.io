// Renders the link-preview cards (1200x630) in the site's Cobalt & Stone look:
// stone paper with the drafting grid, obsidian ink, one cobalt, the site's fonts,
// and the project's dot-matrix print in a plate on the right. Only copy that is already on the site:
// the hero's line and proof numbers for the site card; each project's kind,
// headline and stats for its card. A project without headline numbers shows
// its status and what it is built with instead, both from its page.
//
//   node scripts/make-share-images.mjs
//
// Writes public/og-image.png and public/p/<slug>/og.jpg for every project,
// listed or not, except saywhen, whose card is a designed product shot that
// its own share page (/p/saywhen/) also uses.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LISTED_PROJECTS, PROJECTS } from '../src/data/projects.js';
import { HERO, MORE, NOW, SHIPPED } from '../src/data/site.js';
import { DOT_ART } from './dot-matrix-files.mjs';
import { firstSentences } from '../src/lib/sentences.js';

const root = resolve(import.meta.dirname, '..');
const TELEMETRY = JSON.parse(readFileSync(resolve(root, 'src/data/telemetry.json'), 'utf8'));
// The home page's line and numbers for each project it tells, so a card says what the page says.
const FLAGSHIPS = [NOW, ...SHIPPED, ...MORE].map((item) => ({ slug: item.slug, headline: item.line, stats: item.stats || [] }));
const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// saywhen's card is a designed product shot; Hermione's share page and card
// are maintained with its launch, outside this script.
const KEEP = new Set(['saywhen', 'hermione']);
// `node scripts/make-share-images.mjs hedwig jarvis` redraws just those cards.
const ONLY = process.argv.length > 2 ? process.argv.slice(2) : null;

// Site tokens (src/index.css): --at-stone, --at-obsidian, --at-muted, --at-cobalt.
const STONE = '#f4f3ef', INK = '#111318', MUTED = '#4b5262', COBALT = '#1d4ed8';
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">';
const CSS = `
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: ${STONE}; color: ${INK}; font-family: "IBM Plex Mono", monospace;
  background-image: linear-gradient(rgb(17 19 24 / .05) 1px, transparent 1px), linear-gradient(90deg, rgb(17 19 24 / .05) 1px, transparent 1px); background-size: 48px 48px; }
body::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: ${COBALT}; }
.top { position: absolute; left: 64px; right: 64px; top: 52px; display: flex; justify-content: space-between; font: 500 17px/1 "IBM Plex Mono"; letter-spacing: .14em; text-transform: uppercase; color: ${MUTED}; }
.top b { color: ${COBALT}; font-weight: 500; max-width: 760px; text-align: right; white-space: nowrap; font-size: 15px; }
.foot { position: absolute; left: 64px; right: 64px; bottom: 44px; display: flex; justify-content: space-between; font: 500 17px/1 "IBM Plex Mono"; letter-spacing: .1em; text-transform: uppercase; color: ${MUTED}; }
.big { font-family: "Space Grotesk"; font-weight: 400; line-height: .95; letter-spacing: -.03em; }
.accent { color: ${COBALT}; }
.stats { position: absolute; left: 64px; right: 64px; bottom: 104px; display: flex; gap: 56px; }
.with-art .stats { right: 496px; gap: 28px; }
.with-art .stats div { min-width: 0; flex: 0 0 auto; }
.with-art .stats b { font-size: 30px; white-space: nowrap; }
.with-art .stats span { max-width: 170px; }
.art { position: absolute; right: 64px; top: 104px; width: 384px; max-height: 440px; object-fit: cover; display: block; border: 1px solid rgb(17 19 24 / .18); }
.stats div { border-top: 1px solid rgb(17 19 24 / .18); padding-top: 16px; min-width: 200px; }
.stats b { display: block; font: 500 50px/1 "Space Grotesk"; letter-spacing: -.02em; color: ${COBALT}; }
.stats span { display: block; margin-top: 10px; font: 500 15px/1.3 "IBM Plex Mono"; letter-spacing: .06em; text-transform: uppercase; color: ${MUTED}; max-width: 300px; }
.facts { position: absolute; left: 64px; right: 64px; bottom: 104px; border-bottom: 1px solid rgb(17 19 24 / .18); }
.with-art .facts { right: 496px; }
.facts div { display: flex; align-items: baseline; gap: 24px; border-top: 1px solid rgb(17 19 24 / .18); padding: 13px 0 12px; }
.facts span { flex: 0 0 140px; font: 500 15px/1.3 "IBM Plex Mono"; letter-spacing: .06em; text-transform: uppercase; color: ${MUTED}; }
.facts b { min-width: 0; font: 400 23px/1.3 "Space Grotesk"; color: ${INK}; }
`;
const page = (body, cls = '') => `<!doctype html><html><head>${FONTS}<style>${CSS}</style></head><body class="${cls}">${body}</body></html>`;

// A project's dot-matrix print as a data URL, with the plate it sits on.
const coverOf = (project) => project.spotlightArt || project.cardArt || project.cardShot || project.shots?.[0];
const artFor = (project) => {
  const cover = coverOf(project)?.replace(/^\//, '');
  if (!cover || !DOT_ART.includes(cover)) return null;
  const bytes = readFileSync(resolve(root, 'public', cover));
  const mime = cover.endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
  return `data:${mime};base64,${bytes.toString('base64')}`;
};

// What a project is built with, on one line of a card: its stack in the
// page's order, up to four tools or as many as fit in `room` characters, with
// test-only tools left out, notes in brackets dropped and long names shortened.
const SHORT = { 'Model Context Protocol': 'MCP', 'Hugging Face Transformers': 'Transformers', 'scikit-learn Random Forest': 'scikit-learn' };
const builtWith = (stack = [], room) => {
  const kept = [];
  for (const item of stack) {
    if (/tests only/i.test(item)) continue;
    const name = SHORT[item] ?? item.replace(/\s*\([^)]*\)/g, '');
    if (kept.length === 4 || (kept.length && [...kept, name].join(' · ').length > room)) break;
    kept.push(name);
  }
  return kept.join(' · ');
};
const titleSize = (title) => (title.length <= 9 ? 150 : title.length <= 16 ? 118 : title.length <= 24 ? 92 : 74);

// The site card: the name, the hero's line and the same four numbers as the hero.
const proof = [
  { value: TELEMETRY.lines.toLocaleString('en-US'), label: 'lines of code' },
  { value: String(TELEMETRY.repos), label: 'repositories' },
  { value: TELEMETRY.commits.toLocaleString('en-US'), label: 'commits' },
  { value: '3', label: 'apps released' },
];
const site = page(`
  <p class="top"><span>Mohamed Ansar · Index of work</span><b>Local-first apps · on-device AI</b></p>
  <h1 class="big" style="position:absolute;left:64px;top:100px;font-size:116px;line-height:.92">Mohamed<br><span class="accent">Ansar</span></h1>
  <p style="position:absolute;left:64px;top:366px;font:400 26px/1.4 'IBM Plex Mono';max-width:1080px">${escape(HERO.title.join(' '))} <em style="font-style:normal;color:${COBALT};white-space:nowrap">Building Sirius now.</em></p>
  <div class="stats" style="bottom:52px;gap:40px">${proof.map((p) => `<div style="min-width:240px"><b style="font-size:46px">${escape(p.value)}</b><span>${escape(p.label)}</span></div>`).join('')}</div>`);

const projectCard = (project) => {
  const flag = FLAGSHIPS.find((item) => item.slug === project.slug);
  // The first sentence of the hook, for projects without a stage headline.
  const line = flag?.headline || firstSentences(project.hook, 1);
  const stats = (project.stats?.length ? project.stats.map((s) => [s.value, s.short || s.label]) : flag?.stats || []).slice(0, 3);
  const title = project.title;
  const art = artFor(project);
  // With a print on the right the text column is narrower, so titles step down a size.
  const size = art ? Math.min(titleSize(title), title.length <= 9 ? 118 : title.length <= 16 ? 84 : 64) : titleSize(title);
  const right = art ? 496 : 64;
  const listed = LISTED_PROJECTS.includes(project);
  const facts = [['Status', project.status], ['Built with', builtWith(project.stack, art ? 44 : 72)]].filter(([, value]) => value);
  return page(`
    <p class="top"><span>Mohamed Ansar · ${listed ? 'Selected work' : 'Index of work'}</span><b>${escape(project.kind)}</b></p>
    <div class="head" style="position:absolute;left:64px;top:118px;right:${right}px">
      <h1 class="big" style="font-size:${size}px">${escape(title)}</h1>
      <p style="margin-top:28px;font:400 22px/1.45 'IBM Plex Mono';max-width:960px;color:${MUTED}">${escape(line)}</p>
    </div>
    ${art ? `<img class="art" src="${art}" alt="">` : ''}
    ${stats.length
      ? `<div class="stats">${stats.map(([value, label]) => `<div><b>${escape(value)}</b><span>${escape(label)}</span></div>`).join('')}</div>`
      : `<div class="facts">${facts.map(([label, value]) => `<div><span>${label}</span><b>${escape(value)}</b></div>`).join('')}</div>`}
    <p class="foot"><span>ansarbuilds.dev/work/${escape(project.slug)}</span><span>Case study</span></p>`, art ? 'with-art' : '');
};

// PW_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own download.
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// Copy differs from card to card, so check each layout before keeping it: the
// title fits its column, the words clear the numbers below, the print and the
// footer, and nothing runs off the card.
const clashes = () => {
  const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
  const head = box('.head'), low = box('.stats, .facts'), art = box('.art'), foot = box('.foot');
  const title = document.querySelector('.head h1');
  const found = [];
  if (title && title.scrollWidth > title.clientWidth + 1) found.push('the title is wider than its column');
  if (head && low && head.bottom > low.top - 24) found.push('the words run into the row below them');
  if (low && foot && low.bottom > foot.top - 16) found.push('the row below runs into the footer');
  if (head && art && head.right > art.left - 24) found.push('the words run into the print');
  if ([...document.querySelectorAll('.facts b')].some((fact) => fact.getBoundingClientRect().height > 40)) found.push('a fact wraps onto a second line');
  if (document.body.scrollWidth > 1200 || document.body.scrollHeight > 630) found.push('something runs off the card');
  return found;
};
const problems = [];
const render = async (html, path, type) => {
  await tab.setContent(html, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  const found = await tab.evaluate(clashes);
  if (found.length) problems.push(`${path.replace(root + '/', '')}: ${found.join('; ')}`);
  await tab.screenshot({ path, type, ...(type === 'jpeg' ? { quality: 88 } : {}) });
  console.log(`wrote ${path.replace(root + '/', '')}`);
};
if (!ONLY) await render(site, resolve(root, 'public/og-image.png'), 'png');
for (const project of PROJECTS) {
  if (KEEP.has(project.slug)) continue;
  if (ONLY && !ONLY.includes(project.slug)) continue;
  mkdirSync(resolve(root, 'public/p', project.slug), { recursive: true });
  await render(projectCard(project), resolve(root, 'public/p', project.slug, 'og.jpg'), 'jpeg');
}
await browser.close();
if (problems.length) {
  console.error(`\n${problems.length} card(s) need a look:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
}
