// The project's Playwright config, pointed at the Chrome already on this
// machine, so the smoke and axe tests run without downloading a browser.
//   npx playwright test -c motion-audit/playwright.chrome.config.js
import { defineConfig, devices } from "@playwright/test";
import base from "../playwright.config.js";

export default defineConfig({
  ...base,
  testDir: "../tests/browser",
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", channel: "chrome" } },
  ],
});
