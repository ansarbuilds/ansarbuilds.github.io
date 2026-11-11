// Measures what the audit quotes: intro cover time, scroll smoothness under
// 4x CPU throttling, reveal trigger positions, and two visual defects.
//   node motion-audit/measure.mjs            (prints JSON)
import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:5174";
const browser = await chromium.launch({ channel: "chrome" });
const result = {};

// 1. Intro: how long the curtain covers the page on a first visit.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    window.__curtain = { seen: null, gone: null };
    const check = () => {
      const el = document.querySelector('[class*="z-[400]"]');
      const now = performance.now();
      if (el && window.__curtain.seen === null) window.__curtain.seen = now;
      if (!el && window.__curtain.seen !== null && window.__curtain.gone === null) window.__curtain.gone = now;
      if (window.__curtain.gone === null) requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(3500);
  const c = await page.evaluate(() => window.__curtain);
  result.intro = { firstSeenMs: Math.round(c.seen), goneMs: Math.round(c.gone), coveredMs: Math.round(c.gone - c.seen) };
  await context.close();
}

// 2. Scroll performance and reveal positions, CPU throttled 4x.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => { try { localStorage.setItem("intro-played", "1"); } catch { /* */ } });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(3000);
  result.page = await page.evaluate(() => {
    const main = document.querySelector("main");
    return { scrollHeightPx: main.scrollHeight, viewports: +(main.scrollHeight / main.clientHeight).toFixed(1), canvases: document.querySelectorAll("canvas").length };
  });
  // Where each reveal fires, relative to the bottom edge of the viewport.
  result.reveals = await page.evaluate(async () => {
    const main = document.querySelector("main");
    const fired = [];
    const watch = [...document.querySelectorAll(".ed-section-heading, .sc-cap, .sc-card-grid > *")];
    const done = new Set();
    const step = () => watch.forEach((el, i) => {
      if (done.has(i) || !el.classList.contains("is-in")) return;
      done.add(i);
      fired.push(Math.round(el.getBoundingClientRect().top - innerHeight));
    });
    for (let y = 0; y < main.scrollHeight; y += 40) { main.scrollTop = y; await new Promise((r) => requestAnimationFrame(r)); step(); }
    const below = fired.filter((px) => px > 0);
    return { watched: watch.length, fired: fired.length, firedBelowTheFold: below.length, medianPxBelowFold: below.sort((a, b) => a - b)[Math.floor(below.length / 2)] ?? 0 };
  });
  await page.reload();
  await page.waitForTimeout(3000);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  result.scroll4xCpu = await page.evaluate(async () => {
    const main = document.querySelector("main");
    const longTasks = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => longTasks.push(e.duration))).observe({ entryTypes: ["longtask"] });
    const frames = [];
    let last = performance.now();
    const end = main.scrollHeight - main.clientHeight;
    while (main.scrollTop < end - 2) {
      main.scrollTop += 15;
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      frames.push(now - last);
      last = now;
    }
    frames.sort((a, b) => a - b);
    const at = (q) => +frames[Math.floor(frames.length * q)].toFixed(1);
    return {
      frames: frames.length,
      avgFps: +(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)).toFixed(1),
      p50FrameMs: at(0.5), p95FrameMs: at(0.95), p99FrameMs: at(0.99),
      framesOver33ms: frames.filter((f) => f > 33.4).length,
      framesOver50ms: frames.filter((f) => f > 50).length,
      longTasks: longTasks.length, longestTaskMs: Math.round(Math.max(0, ...longTasks)),
    };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  // 3. Defects: playground CTA contrast, BB-8 over "Back to top".
  result.defects = await page.evaluate(async () => {
    const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
    const main = document.querySelector("main");
    const cta = document.querySelector(".ed-experiment-cta");
    cta.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 1500));
    const section = getComputedStyle(document.querySelector(".ed-experiments"));
    const style = getComputedStyle(cta);
    main.scrollTop = main.scrollHeight;
    await new Promise((r) => setTimeout(r, 2500));
    const droid = document.querySelector(".bb8-edge-character")?.getBoundingClientRect();
    const top = document.querySelector(".ed-footer button").getBoundingClientRect();
    const overlap = !!droid && droid.width > 0 && droid.left < top.right && droid.right > top.left && droid.top < top.bottom && droid.bottom > top.top;
    return { playgroundCta: { color: style.color, background: section.backgroundColor, opacity: style.opacity, contrast: ratio(style.color, section.backgroundColor) }, droidMounted: !!droid && droid.width > 0, droidOverBackToTop: overlap };
  });
  await context.close();
}
await browser.close();
console.log(JSON.stringify(result, null, 2));
