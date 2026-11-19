import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { INTRO_SESSION_KEY } from '../../src/lib/intro.js';
import { SHOTS } from '../../src/film/shots.js';

test('homepage and project navigation work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
  await page.goto('/work/storyera/');
  await expect(page.getByRole('heading', { name: 'StoryEra', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'At a glance' })).toBeVisible();
  await expect(page).toHaveTitle(/StoryEra/);
});

test('old hash links still open their page, at its new URL', async ({ page }) => {
  await page.goto('/#project/storyera');
  await expect(page.getByRole('heading', { name: 'StoryEra', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/work\/storyera\/$/);
  await page.goto('/#emet');
  await expect(page).toHaveURL(/\/playground\/emet\/$/);
});

test('a card opens its project without a page load, and Back returns home', async ({ page }) => {
  await page.addInitScript((key) => sessionStorage.setItem(key, '1'), INTRO_SESSION_KEY);
  await page.goto('/');
  await page.addStyleTag({ content: '.bb8-edge { display: none !important; }' });
  await page.evaluate(() => { window.__sameDocument = true; });
  await page.locator('a[href="/work/jarvis/"]').first().click({ force: true });
  await expect(page).toHaveURL(/\/work\/jarvis\/$/);
  await expect(page.getByRole('heading', { name: 'Jarvis', level: 1 })).toBeVisible();
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#projects')).toBeAttached();
  expect(await page.evaluate(() => window.__sameDocument)).toBe(true);
});

test('the page scrolls the document and section links land on their section', async ({ page }) => {
  await page.addInitScript((key) => sessionStorage.setItem(key, '1'), INTRO_SESSION_KEY);
  await page.goto('/');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('main')).overflowY)).toBe('visible');
  await page.goto('/#contact');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  await expect(page.locator('#contact')).toBeInViewport();
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

test('homepage has no critical automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
});

test('data saver visitors choose whether to load the 3D model', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  let modelRequested = false;
  page.on('request', (request) => { if (request.url().includes('digital_double.glb')) modelRequested = true; });
  await page.goto('/playground/digital-double/');
  await expect(page.getByRole('button', { name: 'Load the 3D model (about 3 MB)' })).toBeVisible();
  expect(modelRequested).toBe(false);
  await page.getByRole('button', { name: 'Load the 3D model (about 3 MB)' }).click();
  await expect.poll(() => modelRequested).toBe(true);
});

test('Jarvis project page renders and links its sample-data demo', async ({ page }) => {
  await page.goto('/work/jarvis/');
  await expect(page.getByRole('heading', { name: 'Jarvis', level: 1 })).toBeVisible();
  const demo = page.getByRole('link', { name: /Try the demo/ });
  await expect(demo).toHaveAttribute('href', '/p/jarvis/demo/');
  // The dev server doesn't map folder URLs in public/ to index.html; GitHub Pages does.
  await page.goto('/p/jarvis/demo/index.html');
  await expect(page.getByText('Portfolio demo with made-up sample data.')).toBeVisible();
});

test('scrolling over the work grid moves the page, not a box inside it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel input is a desktop concern; touch scrolls the page directly');
  // Skip the intro title card, which covers the page for its first moments.
  await page.addInitScript((key) => sessionStorage.setItem(key, '1'), INTRO_SESSION_KEY);
  await page.goto('/');
  // The roaming droid can park over any point on screen; this test is about
  // the lists, so keep it out of the way.
  await page.addStyleTag({ content: '.bb8-edge { display: none !important; }' });
  const list = page.locator('.sc-card-grid').last();
  // Bring the list's top to just under the fixed nav, so the point we wheel
  // over is on the list itself and not on the nav or off screen.
  await list.evaluate((node) => window.scrollBy(0, node.getBoundingClientRect().top - 160));
  // Nothing in the work grid may be a scroll box of its own.
  const scrollers = await page.locator('.sc-card-grid *').evaluateAll((nodes) => nodes.filter((node) => {
    const { overflowY } = getComputedStyle(node);
    return (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
  }).length);
  expect(scrollers).toBe(0);
  const box = await list.boundingBox();
  const point = { x: box.x + box.width / 2, y: box.y + 120 };
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.sc-card-grid'), point)).toBe(true);
  await page.mouse.move(point.x, point.y);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 600);
});

// The film's pre-vis pages only exist on the dev server, which is what these
// tests run against.
test('the storyboard lists every shot and links each to the moving pre-vis', async ({ page }) => {
  await page.goto('/storyboard/');
  await expect(page.getByRole('heading', { name: 'Signal', level: 1 })).toBeVisible();
  await expect(page.locator('.sb-shot')).toHaveCount(SHOTS.length);
  await expect(page.locator('.sb-shot svg')).toHaveCount(SHOTS.length);
  await page.locator('#A2-02b a.sb-frame-link').click();
  await expect(page).toHaveURL(/\/previs\/#A2-02b$/);
  await expect(page.locator('.pv-hud h1')).toContainText('A2-02b');
});

test('the pre-vis follows the scrollbar from the first shot to the last', async ({ page }) => {
  await page.goto('/previs/');
  await expect(page.locator('.pv-hud h1')).toContainText('CO-01');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.pv-hud h1')).toContainText('CO-02');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('.pv-hud h1')).toContainText('FN-03');
  await expect(page.locator('.pv-clock strong')).toHaveText(/^01:3\d\.\d$/);
});

// The hero is the first frame: no veil, no cold open, nothing on top of it.
async function expectUncovered(page, locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
  const onTop = await locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (node === hit || node.contains(hit));
  });
  expect(onTop).toBe(true);
}

test('the home page opens on the finished hero, with nothing over it', async ({ page }) => {
  await page.goto('/');
  const name = page.getByRole('heading', { name: 'Mohamed Ansar', level: 1 });
  await expectUncovered(page, name);
  await expect(page.locator('.co, .co-veil, .route-loader')).toHaveCount(0);
  await expect(page.locator('.sc-feed-card')).toHaveCount(4);
  await expect(page.locator('.sc-hero-next')).toBeVisible();
});

test('Work lands on the stage, and the home page has no film', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.goto('/#projects');
  else await page.locator('.ed-nav').getByRole('link', { name: 'Work', exact: true }).click();
  const first = isMobile ? page.locator('#card-saywhen h3') : page.getByRole('tab', { name: /saywhen/ });
  await expect(first).toBeInViewport();
  await expect(page.locator('canvas.act2-canvas, section.act1, section.act2')).toHaveCount(0);
  const scripts = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => /\/film\//.test(name)));
  expect(scripts).toEqual([]);
});

test('a project page shows its title and first sentence at once, opened directly or from the stage', async ({ page, isMobile }) => {
  await page.goto('/work/jarvis/');
  await expectUncovered(page, page.getByRole('heading', { name: 'Jarvis', level: 1 }));
  await expect(page.getByText('A personal AI agent that lives on my Mac.').first()).toBeAttached();
  await expect(page.locator('.route-loader')).toHaveCount(0);
  test.skip(isMobile, 'the stage stacks on phones; the direct load covers it');
  await page.goto('/#projects');
  await page.getByRole('tab', { name: /Jarvis/ }).click();
  await page.locator('#card-jarvis h3 a').click();
  await expect(page).toHaveURL(/\/work\/jarvis\/$/);
  await expect(page.getByRole('heading', { name: 'Jarvis', level: 1 })).toBeVisible();
});

test('every stage project shows its headline and its numbers', async ({ page }) => {
  await page.goto('/#projects');
  for (const slug of ['saywhen', 'jarvis', 'agent-flight-recorder', 'prh-jepa', 'haloscript', 'digital-double']) {
    const card = page.locator(`#card-${slug}`);
    await expect(card.locator('.st-headline')).not.toBeEmpty();
    expect(await card.locator('.st-stats dt').count()).toBeGreaterThan(0);
  }
});

test('no palette control and no trailing cursor on the home page or a case study', async ({ page }) => {
  for (const path of ['/', '/work/jarvis/']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Colour palette' })).toHaveCount(0);
    await expect(page.locator('.sc-cursor')).toHaveCount(0);
  }
});

test('with reduced motion the short version is the plain section', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.sc-receipts dt')).toHaveCount(4);
  await expect(page.locator('.co, section.act1')).toHaveCount(0);
});

test('the reel opens on its poster, and plays only where the film can run', async ({ page, isMobile }) => {
  await page.goto('/reel/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/reel/i);
  await expect(page.locator('.reel-still img')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the work' })).toBeVisible();
  await expect(page.locator('.reel-projects a')).toHaveCount(6);
  await expect(page.locator('canvas')).toHaveCount(0);
  if (isMobile) await expect(page.getByRole('button', { name: 'Play the film' })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/reel/');
  await expect(page.getByRole('button', { name: 'Play the film' })).toHaveCount(0);
});

test('the reel plays the cold open with a Skip and a way out on every frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'phones get the poster only');
  test.setTimeout(90000);
  await page.goto('/reel/');
  const play = page.getByRole('button', { name: 'Play the film' });
  test.skip(await play.count() === 0, 'no WebGL 2 in this browser');
  await play.click();
  await expect(page.locator('.co')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('link', { name: 'Back to the work' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.locator('.co')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('section.act1')).toHaveCount(1);
  await page.getByRole('link', { name: 'Back to the work' }).click();
  await expect(page).toHaveURL(/\/#projects$/);
});
