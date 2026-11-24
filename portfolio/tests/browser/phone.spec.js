import { test, expect } from '@playwright/test';

/* The film on a phone, 375 and 390 wide: it plays the upright cut, and
   nothing around it (the skip button, the tap-for-sound badge, the
   controls) runs past the screen's edges. The film itself is a video, so
   its words cannot overflow. */

for (const width of [375, 390]) {
  test(`the film fits a phone ${width} wide`, async ({ page }, info) => {
    test.setTimeout(60000);
    test.skip(info.project.name !== 'mobile', 'one phone run is enough');
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?coldopen=full');
    await expect(page.locator('.film-player.is-rolling')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.film-video')).toHaveAttribute('src', /film-upright\.mp4$/);
    // Wake the controls, then measure everything around the film.
    await page.mouse.move(100, 300);
    const outside = await page.evaluate(() => {
      const out = [], w = window.innerWidth;
      for (const node of document.querySelectorAll('.film-skip, .film-skip *, .film-tap, .film-controls, .film-controls *')) {
        const box = node.getBoundingClientRect();
        if (!box.width || getComputedStyle(node).display === 'none') continue;
        if (box.right > w + 1 || box.left < -1) out.push(`${node.className} ${Math.round(box.left)}..${Math.round(box.right)} of ${w}`);
      }
      return out;
    });
    expect(outside).toEqual([]);
  });
}
