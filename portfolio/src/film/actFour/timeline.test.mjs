import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_FOUR, SCENES, moments, timeAtProgress } from './timeline.js';
import { ACT_FOUR_SCREENS } from './screens.js';
import { EXPERIMENTS } from '../../data/projects.js';

const steps = Array.from({ length: 401 }, (_, i) => (ACT_FOUR.seconds * i) / 400);

test('every scene opens a real experiment, and every experiment has a scene', () => {
  const ids = EXPERIMENTS.map((e) => e.id);
  assert.deepEqual([...SCENES.map((s) => s.experiment)].sort(), [...ids].sort());
});

test('the page sizes the act from the real timeline', () => {
  assert.ok(Math.abs(ACT_FOUR.screens - ACT_FOUR_SCREENS) < 1e-9, `${ACT_FOUR.screens}`);
  assert.equal(timeAtProgress(1), ACT_FOUR.seconds);
});

test('one card at a time, in film order, after the title has gone', () => {
  const order = [];
  for (const t of steps) {
    const m = moments(t);
    assert.ok(m.cards.filter((c) => c > 0).length <= 1);
    m.cards.forEach((c) => assert.ok(c >= 0 && c <= 1));
    if (m.cards.some((c) => c > 0)) assert.equal(m.title, 0);
    const shown = m.cards.findIndex((c) => c > 0.5);
    if (shown >= 0 && order.at(-1) !== shown) order.push(shown);
  }
  assert.deepEqual(order, [0, 1, 2]);
  assert.equal(moments(ACT_FOUR.seconds).cards.at(-1), 1);
});

test('the network has fully collapsed before the solar system', () => {
  const solar = ACT_FOUR.entries.find((e) => e.shot.id === 'A4-02');
  assert.equal(moments(solar.t0).collapse, 1);
  assert.equal(moments(0).collapse, 0);
});

test('the solar system is gone before the ribbon\'s card', () => {
  for (let i = 0; i <= 400; i++) { const m = moments((ACT_FOUR.seconds * i) / 400); if (m.cards[1] > 0) assert.equal(m.solar, 0); }
});
