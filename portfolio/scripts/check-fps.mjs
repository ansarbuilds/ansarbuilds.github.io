// Plays the home page's film on a real GPU and reports the frame rate
// while each act is on screen. Run on a laptop with the dev server up (npm run dev), not in CI:
// CI machines have no GPU, so their numbers mean nothing.
//
//   node scripts/check-fps.mjs [url]           fails if an act's median frame
//                                              is slower than 50 fps
//   node scripts/check-fps.mjs --mobile [url]  a mid-range phone: 390x844 at
//                                              3x, touch, the CPU throttled
//                                              4x; fails under 30 fps
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const url = args.find((arg) => !arg.startsWith('--')) || 'http://localhost:5173/';
const SLOWEST_MS = 1000 / (mobile ? 30 : 50);

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(mobile
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' }
  : { viewport: { width: 1440, height: 900 } });
if (mobile) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
// The film plays as the page opens (?coldopen=full makes sure of it on the
// dev server). Count every frame while it plays, sorted by the act on screen.
await page.goto(new URL('?coldopen=full', url).href);
await page.waitForSelector('.film-player.is-rolling', { timeout: 60000 });
const byAct = await page.evaluate(() => new Promise((done) => {
  const gaps = {};
  let last = performance.now();
  const step = (now) => {
    const act = document.querySelector('.film-player .is-on')?.dataset.act;
    if (act) (gaps[act] ??= []).push(now - last);
    last = now;
    if (document.querySelector('.film-player')) requestAnimationFrame(step); else done(gaps);
  };
  requestAnimationFrame(step);
}));
let failed = false;
for (const [act, gaps] of Object.entries(byAct)) {
  if (act.startsWith('card-')) continue;
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)], p95 = gaps[Math.floor(gaps.length * 0.95)];
  const ok = median <= SLOWEST_MS;
  failed ||= !ok;
  console.log(`${act.padEnd(8)} ${ok ? 'ok  ' : 'SLOW'} median ${(1000 / median).toFixed(0)} fps, 95th percentile ${(1000 / p95).toFixed(0)} fps`);
}
await browser.close();
process.exit(failed ? 1 : 0);
