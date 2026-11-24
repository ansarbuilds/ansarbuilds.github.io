import { test, expect } from '@playwright/test';

/* The film's text on a phone, 375 and 390 wide: no card, title or line runs
   past the screen edges or out of its box in any act.

   This checks layout, which is the DOM's business, so it does not wait for
   the WebGL scenes (slow under software rendering in CI) and does not
   throttle the CPU. The film plays as the page opens, which mounts every act in the player;
   each act's cards and titles are then forced on screen at once (each is
   normally shown one at a time as the film plays) and measured. Frame rate on a phone is
   scripts/check-fps.mjs --mobile, on a real GPU. */

const ACTS = ['act1', 'act2', 'act3', 'act4', 'finale', 'card-act2', 'card-act3', 'card-act4'];
// Everything the film fades in and out, shown for the measurement.
const SHOW_ALL = `
  .act1-card, .act1-statement, .act1-tools, .act2-title, .act2-card, .act3-title, .act3-card, .act4-title, .act4-card, .fin-block, .film-act-title, .film-act-letter, .film-act-num {
    opacity: 1 !important; visibility: visible !important; transform: none !important;
  }
  /* An act title's letters and numeral, where they land. */
  .film-act-letter, .film-act-num { translate: none !important; scale: none !important; filter: none !important; animation: none !important; transition: none !important; }
  .film-player, .film-player :is(.film-act, .film-chapter) { visibility: visible !important; opacity: 1 !important; }
  .film-chapter-kicker, .film-chapter-title { animation: none !important; }
  .bb8-edge { display: none !important; }
`;

for (const width of [375, 390]) {
  test(`no text overflows during the film at ${width} wide`, async ({ page }, info) => {
    // It walks every act; a busy machine needs longer than the default.
    test.setTimeout(90000);
    test.skip(info.project.name !== 'mobile', 'one phone run is enough');
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?coldopen=full');
    await expect(page.locator('.film-player .film-act')).toHaveCount(5, { timeout: 20000 });
    await page.addStyleTag({ content: SHOW_ALL });
    const found = [];
    for (const act of ACTS) {
      const section = page.locator(`.film-player [data-act="${act}"]`);
      await expect(section).toBeAttached();
      found.push(...await section.evaluate((el, label) => {
        const out = [], w = window.innerWidth;
        for (const node of el.querySelectorAll('h1, h2, h3, p, a, li, span, strong, em, dd, dt')) {
          // Text kept for screen readers only is clipped to a pixel on purpose.
          if (node.closest('.sr-only')) continue;
          const style = getComputedStyle(node);
          if (!node.textContent.trim() || style.display === 'none') continue;
          const box = node.getBoundingClientRect();
          if (!box.width) continue;
          const past = box.right > w + 1 || box.left < -1;
          const clipped = node.scrollWidth > node.clientWidth + 1 && style.overflow !== 'visible';
          if (past || clipped) out.push(`${label}: <${node.tagName.toLowerCase()} class="${node.className}"> "${node.textContent.trim().slice(0, 40)}" ${Math.round(box.left)}..${Math.round(box.right)} of ${w}`);
        }
        return out;
      }, act));
    }
    expect([...new Set(found)]).toEqual([]);
  });
}
