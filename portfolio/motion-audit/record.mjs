// Records the motion baseline: four flows at two viewports, one video each.
//   node motion-audit/record.mjs before   (or: after)
// Needs the dev server on BASE (default http://localhost:5174) and a local
// Chrome; it does not download a browser.
import { chromium } from "@playwright/test";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE || "http://localhost:5174";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), process.argv[2] || "before");
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const wait = (page, ms) => page.waitForTimeout(ms);
const skipIntro = (context) => context.addInitScript(() => { try { localStorage.setItem("intro-played", "1"); } catch { /* private mode */ } });
// Scrolls the page's own scroller (<main>) at a steady reading pace.
const scrollMain = (page, { to = "end", pxPerSecond = 900 } = {}) => page.evaluate(async ({ to, pxPerSecond }) => {
  const main = document.querySelector("main");
  const target = to === "end" ? main.scrollHeight - main.clientHeight : to;
  const step = pxPerSecond / 60;
  while (Math.abs(main.scrollTop - target) > step) {
    main.scrollTop += Math.sign(target - main.scrollTop) * step;
    await new Promise((r) => requestAnimationFrame(r));
  }
  main.scrollTop = target;
}, { to, pxPerSecond });
const scrollTo = (page, selector, offset = 110) => page.evaluate(({ selector, offset }) => {
  const main = document.querySelector("main"), el = document.querySelector(selector);
  main.scrollTop += el.getBoundingClientRect().top - offset;
}, { selector, offset });

const FLOWS = {
  // A first visit: nothing in storage, so the intro plays.
  "first-load": async (page) => { await page.goto(BASE); await wait(page, 4500); },
  "home-scroll": async (page, context) => {
    await skipIntro(context); await page.goto(BASE); await wait(page, 2500);
    await scrollMain(page); await wait(page, 2000);
  },
  "project-open-close": async (page, context) => {
    await skipIntro(context); await page.goto(BASE); await wait(page, 2000);
    await scrollTo(page, "#card-storyera", 260); await wait(page, 1500);
    await page.locator("#card-storyera").click(); await wait(page, 3000);
    await scrollMain(page, { to: 700 }); await wait(page, 800);
    await page.goBack(); await wait(page, 3000);
  },
  "stage-tabs": async (page, context, name) => {
    await skipIntro(context); await page.goto(BASE); await wait(page, 2000);
    await scrollTo(page, ".st", name === "desktop" ? 190 : 90); await wait(page, 1800);
    if (name === "desktop") {
      for (const i of [1, 2, 3, 4, 5, 0]) { await page.locator(".st-tab").nth(i).click(); await wait(page, 2200); }
    } else {
      // No tabs on a phone: the six projects are stacked, so scroll through them.
      const end = await page.evaluate(() => { const m = document.querySelector("main"), s = document.querySelector(".st"); return m.scrollTop + s.getBoundingClientRect().bottom - 400; });
      await scrollMain(page, { to: end, pxPerSecond: 700 }); await wait(page, 1000);
    }
  },
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
for (const [name, device] of Object.entries(VIEWPORTS)) {
  for (const [flow, run] of Object.entries(FLOWS)) {
    const tmp = path.join(out, `.tmp-${name}-${flow}`);
    const context = await browser.newContext({ ...device, recordVideo: { dir: tmp, size: device.viewport } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try { await run(page, context, name); } catch (error) { errors.push(`flow failed: ${error.message}`); }
    const video = page.video();
    await context.close();
    await rename(await video.path(), path.join(out, `${name}-${flow}.webm`));
    await rm(tmp, { recursive: true, force: true });
    console.log(`${name}-${flow}.webm${errors.length ? `  ERRORS: ${errors.join(" | ")}` : ""}`);
  }
}
await browser.close();
