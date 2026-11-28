import { test, expect } from '@playwright/test';
import { INTRO_KEY } from '../../src/lib/intro.js';

/* On a phone, 375 and 390 wide: nothing on the home page or a case study
   runs past the screen's edge, and the nav fits on one line. */

const overflow = (page) => page.evaluate(() => {
  const w = document.documentElement.clientWidth, out = [];
  if (document.documentElement.scrollWidth > w + 1) out.push(`page is ${document.documentElement.scrollWidth} wide`);
  for (const node of document.querySelectorAll('.ab-nav *, main h1, main h2, main p, main a, main dl')) {
    const box = node.getBoundingClientRect();
    if (!box.width || getComputedStyle(node).display === 'none' || node.closest('.ab-device-wrap')) continue;
    if (box.right > w + 1 || box.left < -1) out.push(`${node.tagName}.${node.className} ${Math.round(box.left)}..${Math.round(box.right)} of ${w}`);
  }
  return out;
});

for (const width of [375, 390]) {
  test(`the site fits a phone ${width} wide`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'one phone run is enough');
    await page.addInitScript((key) => sessionStorage.setItem(key, '1'), INTRO_KEY);
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/work/', '/work/hermione/', '/work/sirius/']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await overflow(page), path).toEqual([]);
    }
    const nav = await page.locator('.ab-nav-inner').boundingBox();
    expect(nav.height).toBeLessThan(60);
  });
}
