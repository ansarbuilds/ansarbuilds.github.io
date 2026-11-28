import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { INTRO_KEY } from '../../src/lib/intro.js';
import { LISTED_SLUGS } from '../../src/data/site.js';

// A visitor who has already seen the intro this visit.
const seen = (key) => sessionStorage.setItem(key, '1');

test('the home page tells the story in order, with every section in it', async ({ page }) => {
  await page.addInitScript(seen, INTRO_KEY);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Software that runs');
  const order = await page.evaluate(() => [...document.querySelectorAll('main section[id]')].map((s) => s.id));
  expect(order).toEqual(['top', 'about', 'now', 'shipped', 'more', 'how', 'contact']);
  // The three spotlights, in the order they were asked for.
  const spots = await page.locator('.ab-spot').evaluateAll((nodes) => nodes.map((n) => n.id));
  expect(spots).toEqual(['shipped-hermione', 'shipped-saywhen', 'shipped-haloscript']);
  // The headline number is the profile README's, not a hand-typed one.
  await expect(page.locator('.ab-telemetry .sr-only').nth(1)).toHaveText(/^\d{3},\d{3}$/);
});

test('a first visit plays a short intro that a key press skips', async ({ page }) => {
  await page.goto('/?intro=1');
  const intro = page.getByRole('dialog', { name: 'Intro' });
  await expect(intro).toBeVisible();
  await expect(intro.getByRole('button', { name: 'Skip intro' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(intro).toHaveCount(0, { timeout: 3000 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the intro finishes on its own in under nine seconds and only once a visit', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/');
  const intro = page.getByRole('dialog', { name: 'Intro' });
  await expect(intro).toBeVisible();
  await expect(intro).toHaveCount(0, { timeout: 9000 });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(intro).toHaveCount(0);
});

test('no intro with reduced motion or a section link', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Intro' })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#contact');
  await expect(page.locator('#contact')).toBeInViewport();
  await expect(page.getByRole('dialog', { name: 'Intro' })).toHaveCount(0);
});

test('the theme switch flips light and dark and is remembered', async ({ page }) => {
  await page.addInitScript(seen, INTRO_KEY);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the work index lists only the curated projects, in order', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('.ab-index-list a').first()).toBeVisible();
  const hrefs = await page.locator('.ab-index-list a').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')));
  expect(hrefs).toEqual(LISTED_SLUGS.map((slug) => `/work/${slug}/`));
});

test('a spotlight opens its case study without a page load, and Back returns home', async ({ page }) => {
  await page.addInitScript(seen, INTRO_KEY);
  await page.goto('/');
  await page.evaluate(() => { window.__sameDocument = true; });
  await page.locator('#shipped-saywhen a[href="/work/saywhen/"]').first().click();
  await expect(page).toHaveURL(/\/work\/saywhen\/$/);
  await expect(page.getByRole('heading', { name: 'saywhen', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The short version' })).toBeVisible();
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#shipped')).toBeAttached();
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
});

test('older write-ups stay reachable but are kept out of search', async ({ page }) => {
  await page.goto('/work/storyera/');
  await expect(page.getByRole('heading', { name: 'StoryEra', level: 1 })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/work/hermione/');
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
});

test('old hash links still open their page, at its new URL', async ({ page }) => {
  await page.goto('/#project/saywhen');
  await expect(page.getByRole('heading', { name: 'saywhen', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/work\/saywhen\/$/);
  await page.goto('/#lineage-demo');
  await expect(page).toHaveURL(/\/playground\/lineage-demo\/$/);
});

test('no link on a case study points at a private repository', async ({ page }) => {
  for (const slug of LISTED_SLUGS) {
    await page.goto(`/work/${slug}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const hrefs = await page.locator('main a[href*="github.com/ansarbuilds/"]').evaluateAll((nodes) => nodes.map((n) => n.href));
    for (const href of hrefs) expect(href, slug).not.toMatch(/github\.com\/ansarbuilds\/(Hermione|sirius|haloscript|decision-models)(\/|$)/i);
  }
});

test('share pages open their matching case studies', async ({ page }) => {
  const projects = [
    ['agent-flight-recorder', 'Agent Flight Recorder'],
    ['storyera', 'StoryEra'],
    ['reptrack', 'RepTrack'],
    ['saywhen', 'saywhen'],
  ];
  for (const [slug, title] of projects) {
    // Vite serves the explicit file; GitHub Pages also serves the folder URL.
    const response = await page.goto(`/p/${slug}/index.html`);
    expect(response.status()).toBe(200);
    await page.getByRole('link', { name: 'Read the full case study' }).click();
    await expect(page).toHaveURL(new RegExp(`/work/${slug}/$`));
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  }
});

// Pages that stand for the rest: home, the index, three case studies, one
// older write-up, the lineage demo and a standalone explainer.
const A11Y_PAGES = ['/', '/work/', '/work/hermione/', '/work/saywhen/', '/work/sirius/', '/work/hedwig/', '/playground/lineage-demo/', '/p/prh-jepa/explainer.html'];

for (const path of A11Y_PAGES) {
  test(`${path} has no critical or serious automated accessibility violations`, async ({ page }) => {
    await page.addInitScript((key) => sessionStorage.setItem(key, '1'), INTRO_KEY);
    await page.goto(path);
    // The heading, not just the frame: project pages load their content after it.
    await expect(page.locator('main h1').first()).toBeVisible();
    // Scroll through once so everything that waits to be seen is drawn.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      window.scrollTo(0, 0);
    });
    // Judge the settled page: text caught half faded in reads as low contrast.
    // CSS motion stops at once; the scripted entrances (the stat tiles' stagger
    // ends at 0.81 s) get time to land.
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; }' });
    await page.waitForTimeout(1200);
    const result = await new AxeBuilder({ page }).analyze();
    const bad = result.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('Jarvis project page renders and links its sample-data demo', async ({ page }) => {
  await page.goto('/work/jarvis/');
  await expect(page.getByRole('heading', { name: 'Jarvis', level: 1 })).toBeVisible();
  const demo = page.getByRole('link', { name: /Try the demo/ });
  await expect(demo).toHaveAttribute('href', '/p/jarvis/demo/');
  // The dev server doesn't map folder URLs in public/ to index.html; GitHub Pages does.
  await page.goto('/p/jarvis/demo/index.html');
  await expect(page.getByText('Portfolio demo with made-up sample data.')).toBeVisible();
});

test('the command palette lists every project, works by keyboard and gives focus back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the palette button lives in the desktop nav');
  await page.addInitScript(seen, INTRO_KEY);
  await page.goto('/');
  const opener = page.getByRole('button', { name: /open the command palette/ });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  const box = dialog.getByRole('combobox');
  await expect(box).toBeFocused();
  // Every listed project is there.
  for (const name of ['Hermione', 'saywhen', 'Haloscript', 'Agent Flight Recorder', 'Sirius']) await expect(dialog.getByRole('option', { name: new RegExp(`^${name}`) }).first()).toBeVisible();
  // The highlighted result is announced through aria-activedescendant.
  await page.keyboard.press('ArrowDown');
  const active = await box.getAttribute('aria-activedescendant');
  await expect(dialog.locator(`#${active}`)).toHaveAttribute('aria-selected', 'true');
  // Tab stays inside the dialog.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  // Escape closes it and gives focus back to the button that opened it.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  // Typing filters, and Enter opens the highlighted project.
  await page.keyboard.press('Enter');
  await expect(box).toBeFocused();
  await page.keyboard.type('flight');
  await expect(dialog.getByRole('option').first()).toContainText('Flight Recorder');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work\/agent-flight-recorder\/$/);
});
