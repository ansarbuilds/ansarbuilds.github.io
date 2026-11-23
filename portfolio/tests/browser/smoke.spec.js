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

test('homepage has no critical or serious automated accessibility violations', async ({ page }) => {
  await page.addInitScript((key) => sessionStorage.setItem(key, '1'), INTRO_SESSION_KEY);
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  // Judge the settled page: text caught half faded in reads as low contrast.
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition: none !important; }' });
  // The short version's statement reveals word by word as it scrolls up:
  // judge it read in full.
  await page.locator('.sc-statement').evaluate((node) => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25));
  await page.waitForTimeout(600);
  const result = await new AxeBuilder({ page }).analyze();
  const bad = result.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
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
  // The page itself moved (smooth scrolling eases in, and on a busy machine
  // it can take a few seconds), rather than a box inside the list.
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 15000 }).toBeGreaterThan(before + 300);
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
  await expect(page.locator('.pv-hud h1')).toContainText('FN-02');
  await expect(page.locator('.pv-clock strong')).toHaveText(/^01:1\d\.\d$/);
});

// A visitor who has been here before: the page, without the poster.
const RETURNING = (key) => { sessionStorage.setItem(key, '1'); sessionStorage.setItem('cold-open-played', '1'); };

test('a first visit plays the film on its own, with a big way out and sound on the first tap', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/?coldopen=full');
  await expect(page.locator('.film-ident')).toBeVisible();
  const skip = page.getByRole('button', { name: 'Skip the movie' });
  await expect(skip).toBeVisible();
  await expect(skip).toContainText('You can skip this.');
  // A browser plays no sound before a tap: the film asks for one, and a
  // tap does not skip anything.
  await expect(page.locator('.film-tap')).toBeVisible();
  await page.mouse.click(400, 400);
  await expect(page.locator('.co')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.film-player.is-rolling')).toBeVisible({ timeout: 40000 });
  await expect(page.locator('.film-player .film-act.is-on')).toHaveAttribute('data-act', 'act1');
  // The page under the film holds still and is out of reach.
  await expect(page.locator('#main-content')).toHaveAttribute('inert', '');
  await expect(page.getByRole('button', { name: 'Pause the film' })).toBeAttached();
  await expect(page.getByRole('slider', { name: 'Where the film is' })).toBeAttached();
  // The skip lands on the page, which then scrolls as usual.
  await skip.click();
  await expect(page.locator('.film-player, .film-skip')).toHaveCount(0);
  await expect(page.locator('#main-content')).not.toHaveAttribute('inert', '');
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
});

test('the skip button lifts the film straight off the page, even before the cold open', async ({ page }) => {
  await page.goto('/?coldopen=full');
  await page.getByRole('button', { name: 'Skip the movie' }).click();
  await expect(page.locator('.film-ident, .co, .film-player, .film-skip')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Mohamed Ansar', level: 1 })).toBeVisible();
  await expect(page.locator('.ed-nav')).toHaveCSS('opacity', '1');
  // And it does not come back on its own.
  await page.waitForTimeout(3500);
  await expect(page.locator('.co')).toHaveCount(0);
});

test('Escape during the cold open skips the whole film', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/?coldopen=full');
  await expect(page.locator('.co')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await expect(page.locator('.co, .film-player, .film-skip')).toHaveCount(0, { timeout: 4000 });
  await expect(page.getByRole('heading', { name: 'Mohamed Ansar', level: 1 })).toBeVisible();
});

test('the film plays again on a later visit, but not on a reload in the same visit', async ({ page }) => {
  // Been here before, in another visit: it still plays as the page opens.
  await page.addInitScript((key) => localStorage.setItem(key, '1'), INTRO_SESSION_KEY);
  await page.goto('/');
  await expect(page.locator('.film-ident')).toBeVisible();
  await page.getByRole('button', { name: 'Skip the movie' }).click();
  await page.reload();
  await expect(page.locator('.film-ident, .co')).toHaveCount(0);
});

test('the film does not play on its own for reduced motion, a section link, or a second page view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.film-ident, .co')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#contact');
  await expect(page.locator('.film-ident, .co')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.setItem('cold-open-played', '1'));
  await page.goto('/');
  await expect(page.locator('.film-ident, .co')).toHaveCount(0);
});

test('a returning visitor can watch the film from the nav, and pause it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the nav button is the same on a phone');
  test.setTimeout(120000);
  await page.addInitScript(RETURNING, INTRO_SESSION_KEY);
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.locator('.ed-nav').getByRole('button', { name: 'Watch the film' }).click();
  await expect(page.locator('.film-ident')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('.co')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.film-player.is-rolling')).toBeVisible({ timeout: 40000 });
  // The controls tuck away while the film plays untouched; moving the
  // pointer brings them back.
  await page.mouse.move(300, 300);
  await page.mouse.move(320, 320);
  await page.getByRole('button', { name: 'Pause the film' }).click({ timeout: 5000 });
  const scrub = page.getByRole('slider', { name: 'Where the film is' });
  const at = await scrub.inputValue();
  await page.waitForTimeout(1200);
  expect(await scrub.inputValue()).toBe(at);
  await page.getByRole('button', { name: 'Skip the movie' }).click();
  await expect(page.locator('.film-player')).toHaveCount(0);
});

test('the home page is a plain page to scroll, with every section in it', async ({ page }) => {
  await page.addInitScript(RETURNING, INTRO_SESSION_KEY);
  await page.goto('/');
  await expect(page.locator('.film-act')).toHaveCount(0);
  await expect(page.locator('.sc-receipts dt')).toHaveCount(4);
  for (const id of ['projects', 'capabilities', 'more', 'ai', 'contact']) await expect(page.locator(`#${id}`)).toHaveCount(1);
  for (const href of ['/playground/explore/', '/playground/infinity/', '/playground/emet/']) await expect(page.locator(`section#ai a[href="${href}"]`)).toHaveCount(1);
  await expect(page.locator('#contact a[href^="mailto:"]').first()).toBeAttached();
});

test('with reduced motion there is no film to watch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Watch the film' })).toHaveCount(0);
  await expect(page.locator('.sc-receipts dt')).toHaveCount(4);
});

test('the whole film runs under 30 seconds, landing to page', async ({ page }) => {
  await page.goto('/?coldopen=full');
  // The player's own running time, on its scrub bar...
  const player = Number(await page.getByRole('slider', { name: 'Where the film is' }).getAttribute('max', { timeout: 20000 }));
  // ...plus what plays before it: the ident and the cold open's short cut.
  const before = 1.2 + await page.evaluate(async () => { const { T, SHORT_START } = await import('/src/film/coldOpen/score.js'); return T.open - SHORT_START; });
  expect(player + before).toBeLessThan(30);
});

test('the film keeps its words as real text and its links real, and what is off screen is out of reach', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/?coldopen=full');
  const reel = page.locator('.film-player');
  await expect(reel.locator('.film-act')).toHaveCount(5, { timeout: 20000 });
  await expect(reel.locator('.film-act-title')).toHaveText(['I. The receipts']);
  await expect(reel.locator('.film-chapter-title')).toHaveText(['Seven builds', 'What I bring', 'The playground']);
  await expect(reel.getByText('Most AI demos stop at the demo.')).toBeAttached();
  await expect(reel.locator('article.act2-card a.act2-primary').first()).toHaveAttribute('href', '/work/hedwig/');
  await expect(reel.locator('article.act3-card a[href="/work/jarvis/"]')).toHaveCount(1);
  await expect(reel.locator('a.act4-cta[href="/playground/emet/"]')).toHaveCount(1);
  await expect(reel.locator('a.fin-email')).toHaveAttribute('href', /^mailto:/);
  await expect(reel.locator('.fin-credit')).toHaveText('Directed, designed and built by Mohamed Ansar');
  await expect(page.locator('.film-player .film-act.is-on')).toHaveAttribute('data-act', 'act1', { timeout: 40000 });
  for (const act of ['act2', 'act3', 'act4', 'finale', 'card-act2']) await expect(page.locator(`.film-player [data-act="${act}"]`)).toHaveAttribute('inert', '');
});

test('the command palette lists every project, works by keyboard and gives focus back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the palette button lives in the desktop nav');
  await page.addInitScript((key) => { sessionStorage.setItem(key, '1'); sessionStorage.setItem('cold-open-played', '1'); }, INTRO_SESSION_KEY);
  await page.goto('/');
  const opener = page.getByRole('button', { name: /open the command palette/ });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  const box = dialog.getByRole('combobox');
  await expect(box).toBeFocused();
  // Every flagship is there, including the two the old list left out.
  for (const name of ['saywhen', 'Agent Flight Recorder', 'Jarvis', 'Digital Me']) await expect(dialog.getByRole('option', { name: new RegExp(name) })).toHaveCount(1);
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
