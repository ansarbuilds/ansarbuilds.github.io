// Still frames of the home page for a quick look: node motion-audit/shots.mjs <outDir> [mobile]
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const BASE = process.env.BASE || "http://localhost:5174";
const out = process.argv[2] || "motion-audit/shots";
const mobile = process.argv[3] === "mobile";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => { try { localStorage.setItem("intro-played", "1"); } catch { /* */ } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(BASE);
await page.waitForTimeout(2500);
const stops = [["hero", null], ["brief", ".sc-brief"], ["stage", "#projects"], ["caps", "#capabilities"], ["grid", ".sc-card-grid"], ["play", "#ai"], ["contact", "#contact"]];
for (const [name, selector] of stops) {
  if (selector) await page.evaluate((sel) => { const m = document.querySelector("main"), el = document.querySelector(sel); m.scrollTop += el.getBoundingClientRect().top - 80; }, selector);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/${mobile ? "m-" : ""}${name}.jpg`, type: "jpeg", quality: 70 });
}
await browser.close();
console.log(errors.length ? `ERRORS: ${[...new Set(errors)].join(" | ")}` : "no page errors");
