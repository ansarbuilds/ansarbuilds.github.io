// Frame-by-frame stills of the timed moments, for checking choreography:
//   node motion-audit/frames.mjs <outDir>
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const BASE = process.env.BASE || "http://localhost:5174";
const out = process.argv[2] || "motion-audit/frames";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 60 });
const errors = [];
const watch = (page) => { page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); };

// 1. Intro on a first visit: one frame every 200ms.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); watch(page);
  await page.goto(BASE, { waitUntil: "commit" });
  await page.waitForSelector(".sc-hero-name");
  for (let i = 0; i < 9; i += 1) { await shot(page, `intro-${String(i * 200).padStart(4, "0")}`); await page.waitForTimeout(200); }
  await page.waitForTimeout(1500); await shot(page, "intro-done");
  await context.close();
}
// 2. Card to page and back, and a tab change.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => { try { localStorage.setItem("intro-played", "1"); } catch { /* */ } });
  const page = await context.newPage(); watch(page);
  await page.goto(BASE); await page.waitForTimeout(2000);
  await page.evaluate(() => { const m = document.querySelector("main"), el = document.querySelector("#card-storyera"); m.scrollTop += el.getBoundingClientRect().top - 260; });
  await page.waitForTimeout(1500); await shot(page, "vt-0-card");
  await page.locator("#card-storyera").click();
  for (const ms of [120, 300, 700]) { await page.waitForTimeout(ms === 120 ? 120 : ms - 120); await shot(page, `vt-open-${ms}`); }
  await page.waitForTimeout(1200);
  const focus = await page.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.textContent || "").slice(0, 20));
  await page.goBack();
  for (const ms of [120, 400]) { await page.waitForTimeout(ms === 120 ? 120 : 280); await shot(page, `vt-back-${ms}`); }
  await page.waitForTimeout(1200); await shot(page, "vt-back-done");
  const back = await page.evaluate(() => ({ top: Math.round(document.querySelector("#card-storyera").getBoundingClientRect().top), vt: !!document.startViewTransition }));
  await page.evaluate(() => { const m = document.querySelector("main"), el = document.querySelector(".st"); m.scrollTop += el.getBoundingClientRect().top - 190; });
  await page.waitForTimeout(1500);
  await page.locator(".st-tab").nth(2).click();
  await page.waitForTimeout(150); await shot(page, "tab-150");
  await page.waitForTimeout(900); await shot(page, "tab-done");
  console.log(JSON.stringify({ focusAfterOpen: focus, back }));
  await context.close();
}
await browser.close();
console.log(errors.length ? `ERRORS: ${[...new Set(errors)].join(" | ")}` : "no page errors");
