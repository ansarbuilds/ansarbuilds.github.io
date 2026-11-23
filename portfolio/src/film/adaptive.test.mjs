import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdaptive } from './adaptive.js';

const run = (adaptive, ms, frames, skip = false) => { for (let i = 0, t = run.t ?? 0; i < frames; i++) { t += ms; adaptive.frame(t, skip); run.t = t; } };

test('a fast device keeps full quality', () => {
  const quality = { dpr: 1.75 }, bloom = { enabled: true };
  let applied = 0;
  const a = createAdaptive({ quality, bloom, apply: () => applied++ });
  run(a, 16.7, 600);
  assert.equal(quality.dpr, 1.75);
  assert.equal(bloom.enabled, true);
  assert.equal(applied, 0);
});

test('a slow device steps down the resolution, then loses the glow, then stops', () => {
  const quality = { dpr: 1.75 }, bloom = { enabled: true };
  const seen = [];
  const a = createAdaptive({ quality, bloom, apply: () => seen.push(quality.dpr) });
  run(a, 40, 2000);
  assert.ok(seen.length >= 2 && seen.every((d, i) => i === 0 || d < seen[i - 1]), `steps ${seen}`);
  assert.equal(quality.dpr, 0.75);
  assert.equal(bloom.enabled, false);
});

test('frames that are slow on purpose, and stalls, are not counted', () => {
  const quality = { dpr: 1.5 }, bloom = { enabled: true };
  const a = createAdaptive({ quality, bloom, apply: () => {} });
  run(a, 66, 600, true);
  run(a, 1000, 50);
  assert.equal(quality.dpr, 1.5);
});

test('a slow device drops the lens effects before anything else', () => {
  const quality = { dpr: 1.75 }, bloom = { enabled: true }, lens = { on: true };
  run.t = 0;
  const a = createAdaptive({ quality, bloom, lens, apply: () => {} });
  run(a, 40, 91);
  assert.equal(lens.on, false);
  assert.equal(quality.dpr, 1.75);
  assert.equal(bloom.enabled, true);
});
