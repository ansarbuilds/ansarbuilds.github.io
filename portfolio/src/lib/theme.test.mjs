// Every text colour the design uses holds WCAG AA contrast (4.5:1) on the
// page background, in light and in dark. The values mirror site.css.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const THEMES = {
  light: { bg: '#f3f2ee', bg2: '#ebe9e3', fg: '#0f1115', 'fg-2': '#353b48', 'fg-3': '#5a6070', accent: '#1d4ed8', 'accent-ink': '#1e40af' },
  dark: { bg: '#07080c', bg2: '#0e1017', fg: '#eeece6', 'fg-2': '#c3c6cf', 'fg-3': '#9196a3', accent: '#7c9bff', 'accent-ink': '#a9bcff' },
};

const channel = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => { const [r, g, b] = hex.match(/\w\w/g).map((h) => channel(parseInt(h, 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

for (const [name, t] of Object.entries(THEMES)) {
  test(`${name}: every text colour reads at AA on both grounds`, () => {
    for (const ink of ['fg', 'fg-2', 'fg-3', 'accent', 'accent-ink']) {
      for (const ground of ['bg', 'bg2']) {
        const ratio = contrast(t[ink], t[ground]);
        assert.ok(ratio >= 4.5, `${ink} on ${ground}: ${ratio.toFixed(2)}`);
      }
    }
  });
}

test('the primary button label reads on cobalt', () => {
  assert.ok(contrast('#ffffff', THEMES.light.accent) >= 4.5);
  assert.ok(contrast('#07080c', THEMES.dark.accent) >= 4.5);
});
