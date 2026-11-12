// Measures what the audit quotes: intro cover time, scroll smoothness under
// 4x CPU throttling, reveal trigger positions, and two visual defects.
//   node motion-audit/measure.mjs            (prints JSON)
import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:5174";
const browser = await chromium.launch({ channel: "chrome" });
const result = {};

// 1. Intro on a first visit. Before the motion pass this was a curtain
// (an element at z-[400]); now the hero is its own title card and hands
// over when the nav stops being held back (.is-booting). Both are timed,
// so the script works on either side of the change.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    window.__intro = { curtainSeen: null, curtainGone: null, heroSeen: null, handedOver: null, nameSettled: null };
    const check = () => {
      const now = performance.now(), t = window.__intro;
      const curtain = document.querySelector('[class*="z-[400]"]');
      if (curtain && t.curtainSeen === null) t.curtainSeen = now;
      if (!curtain && t.curtainSeen !== null && t.curtainGone === null) t.curtainGone = now;
      const name = document.querySelector(".sc-hero-name");
      if (name && t.heroSeen === null) t.heroSeen = now;
      const nav = document.querySelector(".ed-nav");
      if (nav && name && !nav.classList.contains("is-booting") && t.handedOver === null) t.handedOver = now;
      if (name && t.handedOver !== null && t.nameSettled === null && getComputedStyle(name).transform === "none") t.nameSettled = now;
      if (now < 6000) requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(4000);
  const t = await page.evaluate(() => window.__intro);
  const since = (v) => (v === null ? null : Math.round(v - t.heroSeen));
  result.intro = t.curtainSeen !== null
    ? { kind: "curtain", coveredMs: Math.round(t.curtainGone - t.curtainSeen) }
    : { kind: "handoff", restStartsMs: since(t.handedOver), nameInPlaceMs: since(t.nameSettled) };
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
    const taskStarts = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => { longTasks.push(e.duration); taskStarts.push(Math.round(e.startTime)); })).observe({ entryTypes: ["longtask"] });
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
      // The BB-8 companion loads three.js on first input. If a long task
      // starts as that arrives, it is the companion, not the page's motion.
      longTaskStartsMs: taskStarts,
      companionScriptsArrivedMs: performance.getEntriesByType("resource").filter((r) => /three|BB8|createBB8/i.test(r.name)).map((r) => Math.round(r.responseEnd)).sort((a, b) => a - b).slice(0, 4),
    };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  result.css = await page.evaluate(() => {
    let keyframes = 0;
    const walk = (rules) => { for (const rule of rules) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) keyframes += 1;
      if (rule.cssRules) walk(rule.cssRules);
    } };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
    return { keyframes };
  });

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
