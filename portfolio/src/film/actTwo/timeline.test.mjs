import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_TWO, BUILT, MATCHES, moments, openingCamera, shotsFor, timeAtProgress } from './timeline.js';
import { ACT_TWO_SCREENS } from './screens.js';
import { FLAGSHIPS } from '../../data/showcase.js';
import { poseAt } from '../rig.js';

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('the built sets are flagship projects, in the home page order', () => {
  const order = FLAGSHIPS.map((flag) => flag.slug);
  assert.deepEqual(BUILT, order.slice(0, BUILT.length));
});

test('the page sizes the act from the real timeline', () => {
  assert.ok(Math.abs(ACT_TWO.screens - ACT_TWO_SCREENS) < 1e-9, `screens.js says ${ACT_TWO_SCREENS}, the timeline ${ACT_TWO.screens}`);
  assert.equal(timeAtProgress(0), 0);
  assert.equal(timeAtProgress(1), ACT_TWO.seconds);
});

test('each project opens on a held cut, shorter than the scenes it joins, and arrives on the storyboard camera', () => {
  const at = (id) => ACT_TWO.entries.find((e) => e.shot.id === id);
  for (const slug of BUILT) {
    const [arrive, scene] = shotsFor(slug);
    const start = at(`${arrive.id}-in`);
    assert.ok(start.shot.cut);
    // Held: the camera does not move while the cut is on screen.
    assert.ok(distance(poseAt(ACT_TWO, start.t0).pos, poseAt(ACT_TWO, start.t1 - 1e-6).pos) < 1e-6);
    assert.ok(start.s1 - start.s0 < (at(arrive.id).s1 - at(arrive.id).s0) / 2);
    assert.ok(distance(poseAt(ACT_TWO, at(arrive.id).t1 - 1e-9).pos, arrive.camera.pos) < 1e-3);
    assert.ok(distance(poseAt(ACT_TWO, at(scene.id).t1 - 1e-9).pos, scene.camera.pos) < 1e-3);
  }
});

test('a match cut puts the new subject where the last one stood, the same size', () => {
  for (const [slug, from] of Object.entries(MATCHES)) {
    const open = openingCamera(slug), [, last] = shotsFor(from);
    assert.ok(Math.abs(distance(open.pos, open.look) - distance(last.camera.pos, last.camera.look)) < 1e-6);
    assert.equal(open.fov, last.camera.fov);
  }
});

test('overlays: the cut is over before the card, and the bars open for the scene', () => {
  for (let i = 0; i <= 400; i++) {
    for (const m of moments((ACT_TWO.seconds * i) / 400)) {
      for (const key of ['arrive', 'scene', 'cut', 'title', 'card']) assert.ok(m[key] >= 0 && m[key] <= 1, `${key} ${m[key]}`);
      if (m.card > 0) assert.equal(m.cut, 0);
      if (m.scene > 0) assert.equal(m.bars, false);
    }
  }
  const first = moments(0.01)[0];
  assert.ok(first.cut === 1 && first.bars);
  const last = moments(ACT_TWO.seconds).at(-1);
  assert.equal(last.card, 1);
});
