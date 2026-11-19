import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_TWO, ACT_TWO_SHOTS, BUILT, moments, shotsFor, timeAtProgress } from './timeline.js';
import { ACT_TWO_SCREENS } from './screens.js';
import { FLAGSHIPS } from '../../data/showcase.js';
import { SETS } from '../shots.js';
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

test('each project starts on a cut far from its set and arrives on the storyboard camera', () => {
  for (const slug of BUILT) {
    const [arrive, scene] = shotsFor(slug);
    const start = ACT_TWO_SHOTS.find((shot) => shot.id === `${arrive.id}-in`);
    assert.ok(start.cut);
    assert.ok(distance(start.camera.pos, SETS[slug].at) > distance(arrive.camera.pos, SETS[slug].at) + 100);
    const at = (id) => ACT_TWO.entries.find((e) => e.shot.id === id);
    assert.ok(distance(poseAt(ACT_TWO, at(arrive.id).t1 - 1e-9).pos, arrive.camera.pos) < 1e-3);
    assert.ok(distance(poseAt(ACT_TWO, at(scene.id).t1 - 1e-9).pos, scene.camera.pos) < 1e-3);
  }
});

test('overlays: the streak is over before the card, and the bars open for the scene', () => {
  for (let i = 0; i <= 400; i++) {
    for (const m of moments((ACT_TWO.seconds * i) / 400)) {
      for (const key of ['arrive', 'scene', 'streak', 'title', 'card']) assert.ok(m[key] >= 0 && m[key] <= 1, `${key} ${m[key]}`);
      if (m.card > 0) assert.equal(m.streak, 0);
      if (m.scene > 0) assert.equal(m.bars, false);
    }
  }
  const first = moments(0.01)[0];
  assert.ok(first.streak > 0.9 && first.bars);
  const last = moments(ACT_TWO.seconds).at(-1);
  assert.equal(last.card, 1);
});
