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

test('the cold open plays over the home page, hands over to the hero, and can be skipped', async ({ page }) => {
  await page.goto('/?coldopen=full');
  // Its code can take a while on a dev server that has just rebuilt three.js.
  await expect(page.locator('.co')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.ed-nav')).toHaveCSS('opacity', '0');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.co, .co-veil')).toHaveCount(0, { timeout: 4000 });
  await expect(page.getByRole('heading', { name: 'Mohamed Ansar', level: 1 })).toBeVisible();
  await expect(page.locator('.ed-nav')).toHaveCSS('opacity', '1');
});

test('the cold open does not play for reduced motion, a section link, or a second page view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.co, .co-veil')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#contact');
  await expect(page.locator('.co, .co-veil')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.setItem('cold-open-played', '1'));
  await page.goto('/');
  await expect(page.locator('.co, .co-veil')).toHaveCount(0);
});

test('Act I pins its stage, keeps its words as real text, and loads its scene near the screen', async ({ page }) => {
  await page.addInitScript((key) => { sessionStorage.setItem(key, '1'); sessionStorage.setItem('cold-open-played', '1'); }, INTRO_SESSION_KEY);
  await page.goto('/');
  const act = page.locator('section.act1');
  await expect(act).toHaveCount(1);
  await expect(act.getByText('Most AI demos stop at the demo.')).toBeAttached();
  await expect(act.locator('dl dt')).toHaveCount(4);
  await act.evaluate((node) => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY + window.innerHeight));
  await expect(act).toHaveClass(/is-live/, { timeout: 8000 });
  const stage = await page.locator('.act1-stage').boundingBox();
  expect(Math.abs(stage.y)).toBeLessThan(2);
});

test('with reduced motion the short version is the plain section', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('section.act1')).toHaveCount(0);
  await expect(page.locator('.sc-receipts dt')).toHaveCount(4);
});

test('Act II plays above the work stage, with real links that are hidden until their card shows', async ({ page }) => {
  await page.addInitScript((key) => { sessionStorage.setItem(key, '1'); sessionStorage.setItem('cold-open-played', '1'); }, INTRO_SESSION_KEY);
  await page.goto('/');
  const act = page.locator('section.act2');
  await expect(act).toHaveCount(1);
  const card = act.locator('article.act2-card').first();
  // Selected directly: while hidden, it is rightly out of the accessibility tree.
  await expect(card.locator('a.act2-primary')).toHaveAttribute('href', '/work/saywhen/');
  // Before the scene, the card is out of the way of the keyboard.
  await act.evaluate((node) => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY));
  await expect(act).toHaveClass(/is-live/, { timeout: 15000 });
  await expect(card).toBeHidden();
  // At the end of the act, the last project's card is there and usable,
  // and the earlier ones have gone.
  await act.evaluate((node) => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY + node.offsetHeight - window.innerHeight));
  const last = act.locator('article.act2-card').last();
  await expect(last).toBeVisible();
  await expect(last.getByRole('link', { name: 'Read the case study' })).toBeVisible();
  await expect(card).toBeHidden();
  expect(await page.locator('#projects').evaluate((node) => node.getBoundingClientRect().top > 0)).toBe(true);
});

test('Act III replaces What I bring with the monoliths, keeping its links and its place in the nav', async ({ page }) => {
  await page.addInitScript((key) => { sessionStorage.setItem(key, '1'); sessionStorage.setItem('cold-open-played', '1'); }, INTRO_SESSION_KEY);
  await page.goto('/');
  const act = page.locator('section.act3');
  await expect(act).toHaveId('capabilities');
  await expect(act.locator('article.act3-card')).toHaveCount(3);
  await expect(act.locator('article.act3-card a[href="/work/jarvis/"]')).toHaveCount(1);
  await act.evaluate((node) => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY + node.offsetHeight - window.innerHeight));
  await expect(act).toHaveClass(/is-live/, { timeout: 15000 });
  // At the end, the last capability's card is the one showing.
  await expect(act.locator('article.act3-card').last()).toBeVisible();
  await expect(act.locator('article.act3-card').first()).toBeHidden();
});
