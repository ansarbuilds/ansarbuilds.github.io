import { test, expect } from '@playwright/test';

/* The film on a mid-range phone: 375 and 390 wide, the CPU throttled 4x
   through the DevTools protocol. Every act plays, and at every point we
   stop at, no text on screen runs past the edges or out of its box. */

const ACTS = ['act1', 'act2', 'act3', 'act4', 'fin'];
const STOPS = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95];

for (const width of [375, 390]) {
  test(`no text overflows during the film at ${width} wide`, async ({ page, browserName }, info) => {
    test.skip(info.project.name !== 'mobile' || browserName !== 'chromium', 'one phone run is enough');
    // Building every act under software rendering is slow.
    test.setTimeout(240000);
    await page.setViewportSize({ width, height: 844 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => { sessionStorage.setItem('intro-played', '1'); sessionStorage.setItem('cold-open-played', '1'); });
    await page.goto('/');
    await page.addStyleTag({ content: '.bb8-edge { display: none !important; }' });
    const found = [];
    for (const act of ACTS) {
      const section = page.locator(`section.${act}`);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveClass(/is-live/, { timeout: 60000 });
      for (const stop of STOPS) {
        await section.evaluate((el, f) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + f * (el.offsetHeight - window.innerHeight)), stop);
        await page.waitForTimeout(350);
        found.push(...await section.evaluate((el, label) => {
          const out = [], w = window.innerWidth;
          for (const node of el.querySelectorAll('h1, h2, h3, p, a, li, span, strong, em, dd, dt')) {
            const style = getComputedStyle(node);
            // Text kept for screen readers only is clipped to a pixel on purpose.
            if (node.closest('.sr-only')) continue;
            if (!node.textContent.trim() || style.visibility === 'hidden' || style.display === 'none') continue;
            // Only what is actually showing: skip anything inside a hidden or faded-out card.
            let shown = true;
            for (let up = node; up && up !== el; up = up.parentElement) {
              const s = getComputedStyle(up);
              if (s.visibility === 'hidden' || Number(s.opacity) < 0.05) { shown = false; break; }
            }
            if (!shown) continue;
            const box = node.getBoundingClientRect();
            if (!box.width || box.bottom < 0 || box.top > window.innerHeight) continue;
            const past = box.right > w + 1 || box.left < -1;
            const clipped = node.scrollWidth > node.clientWidth + 1 && style.overflow !== 'visible';
            if (past || clipped) out.push(`${label}: <${node.tagName.toLowerCase()} class="${node.className}"> "${node.textContent.trim().slice(0, 40)}" ${Math.round(box.left)}..${Math.round(box.right)} of ${w}`);
          }
          return out;
        }, `${act} at ${stop}`));
      }
    }
    expect([...new Set(found)]).toEqual([]);
  });
}
