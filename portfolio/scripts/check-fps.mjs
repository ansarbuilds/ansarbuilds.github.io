// Plays the home page's film on a real GPU and reports each act's frame
// rate. Run on a laptop with the dev server up (npm run dev), not in CI:
// CI machines have no GPU, so their numbers mean nothing.
//
//   node scripts/check-fps.mjs [url]       fails if an act's median frame
//                                          is slower than 50 fps
import { chromium } from '@playwright/test';

const url = process.argv[2] || 'http://localhost:5173/';
const ACTS = ['section.act1', 'section.act2', 'section.act3', 'section.act4', 'section.fin'];
const SLOWEST_MS = 1000 / 50;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { sessionStorage.setItem('intro-played', '1'); sessionStorage.setItem('cold-open-played', '1'); localStorage.setItem('intro-played', '1'); });
await page.goto(url);
let failed = false;
for (const act of ACTS) {
  if (!(await page.locator(act).count())) { console.log(`${act.padEnd(16)} not on the page`); failed = true; continue; }
  // Into the middle of the act, then wait for its scene to load.
  await page.evaluate((sel) => { const el = document.querySelector(sel); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * 0.4); }, act);
  await page.waitForTimeout(6000);
  // Scroll slowly through it while counting frames.
  const gaps = await page.evaluate(() => new Promise((done) => {
    const times = [];
    const step = (now) => { times.push(now); window.scrollBy(0, 6); if (times.length < 240) requestAnimationFrame(step); else done(times.slice(1).map((t, i) => t - times[i])); };
    requestAnimationFrame(step);
  }));
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)], p95 = gaps[Math.floor(gaps.length * 0.95)];
  const ok = median <= SLOWEST_MS;
  failed ||= !ok;
  console.log(`${act.padEnd(16)} ${ok ? 'ok  ' : 'SLOW'} median ${(1000 / median).toFixed(0)} fps, 95th percentile ${(1000 / p95).toFixed(0)} fps`);
}
await browser.close();
process.exit(failed ? 1 : 0);
