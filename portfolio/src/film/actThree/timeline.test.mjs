import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_THREE, ACT_THREE_SHOTS, CENTRE, MATCH, MATCH_SHARE, PILLARS, cameraAt, moments, timeAtProgress } from './timeline.js';
import { ACT_THREE_SCREENS } from './screens.js';
import { CAPABILITIES } from '../../data/showcase.js';

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const steps = Array.from({ length: 401 }, (_, i) => (ACT_THREE.seconds * i) / 400);

test('one monolith per capability, and the page sizes the act from the real timeline', () => {
  assert.equal(PILLARS.length, CAPABILITIES.length);
  assert.ok(Math.abs(ACT_THREE.screens - ACT_THREE_SCREENS) < 1e-9);
  assert.equal(timeAtProgress(1), ACT_THREE.seconds);
});

test('the camera starts and ends on the storyboard cameras', () => {
  const [rise, orbit] = ACT_THREE_SHOTS;
  assert.ok(distance(cameraAt(ACT_THREE.entries[0].t1 - 1e-6).pos, rise.camera.pos) < 0.05);
  assert.ok(distance(cameraAt(ACT_THREE.seconds).pos, orbit.camera.pos) < 1e-6);
});

test('the camera circles: steady distance from the monoliths and only turns one way', () => {
  let last = -Infinity;
  for (const t of steps.filter((t) => t >= ACT_THREE.entries[1].t0)) {
    const { pos, angle } = cameraAt(t);
    const r = Math.hypot(pos[0] - CENTRE[0], pos[2] - CENTRE[2]);
    assert.ok(r > 25 && r < 55, `radius ${r}`);
    assert.ok(angle >= last - 1e-9);
    last = angle;
  }
});

test('each monolith gets its turn, left to right, one card at a time', () => {
  const order = [];
  for (const t of steps) {
    const m = moments(t);
    assert.ok(m.card.filter((c) => c > 0).length <= 1);
    for (const key of ['rise', 'glow', 'card']) m[key].forEach((v) => assert.ok(v >= 0 && v <= 1));
    const shown = m.card.findIndex((c) => c > 0.5);
    if (shown >= 0 && order.at(-1) !== shown) order.push(shown);
  }
  assert.deepEqual(order, [0, 1, 2]);
});

test('they rise before the orbit, and the title leaves before the first card', () => {
  const atOrbit = moments(ACT_THREE.entries[1].t0);
  atOrbit.rise.forEach((r) => assert.equal(r, 1));
  for (const t of steps) { const m = moments(t); if (m.card.some((c) => c > 0)) assert.equal(m.title, 0); }
});

test('the act opens on a held match cut: the middle monolith stands, framed as the head was', () => {
  const end = ACT_THREE.entries[0].t0 + (ACT_THREE.entries[0].t1 - ACT_THREE.entries[0].t0) * MATCH_SHARE;
  assert.ok(distance(cameraAt(0).pos, MATCH.pos) < 1e-9);
  assert.ok(distance(cameraAt(end).pos, MATCH.pos) < 1e-9);
  const open = moments(0), held = moments(end);
  assert.deepEqual(open.rise, [0, 1, 0]);
  assert.deepEqual(held.rise, [0, 1, 0]);
  assert.ok(MATCH_SHARE * ACT_THREE.entries[0].shot.scroll < ACT_THREE.entries[1].shot.scroll / 2);
});

test('the held match cut is flagged for its sound, only while it is held', () => {
  const end = ACT_THREE.entries[0].t0 + (ACT_THREE.entries[0].t1 - ACT_THREE.entries[0].t0) * MATCH_SHARE;
  assert.equal(moments(0).held, 1);
  assert.equal(moments(end + 1e-6).held, 0);
});

test('each rising monolith slams home once, with a jolt and a shockwave that settle', async () => {
  const { landAt } = await import('./timeline.js');
  for (const i of [0, 2]) {
    const at = landAt(i);
    assert.ok(moments(at - 0.05).rise[i] < 1 && moments(at).rise[i] === 1);
    assert.ok(moments(at + 0.01).slam > 0.9);
    assert.ok(moments(at + 0.3).wave[i] > 0 && moments(at + 0.3).wave[i] < 1);
    assert.equal(moments(at + 1).wave[i], -1);
  }
  assert.equal(moments(0).slam, 0);
  assert.deepEqual(moments(0).wave, [-1, -1, -1]);
});
