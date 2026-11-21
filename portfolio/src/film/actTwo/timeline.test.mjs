import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_TWO, BUILT, moments, shotsFor, timeAtProgress } from './timeline.js';
import { ACT_TWO_SCREENS } from './screens.js';
import { SETS, SHOTS } from '../shots.js';
import { poseAt } from '../rig.js';

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('Act II plays saywhen and Digital Me, each with a set', () => {
  assert.deepEqual(BUILT, ['saywhen', 'digital-double']);
  const played = [...new Set(SHOTS.filter((shot) => shot.act === 'A2').map((shot) => shot.slug))];
  assert.deepEqual(played, BUILT);
  for (const slug of BUILT) assert.ok(SETS[slug]);
});

test('the page sizes the act from the real timeline', () => {
  assert.ok(Math.abs(ACT_TWO.screens - ACT_TWO_SCREENS) < 1e-9, `screens.js says ${ACT_TWO_SCREENS}, the timeline ${ACT_TWO.screens}`);
  assert.equal(timeAtProgress(0), 0);
  assert.equal(timeAtProgress(1), ACT_TWO.seconds);
});

test('each project opens on a held cut and then eases in a short way', () => {
  const at = (id) => ACT_TWO.entries.find((e) => e.shot.id === id);
  for (const slug of BUILT) {
    const [arrive, scene] = shotsFor(slug);
    const a = at(arrive.id), s = at(scene.id);
    assert.ok(arrive.cut);
    assert.equal(arrive.scroll, 0.35);
    assert.equal(arrive.seconds, 1.6);
    assert.equal(scene.scroll, 0.85);
    assert.equal(scene.seconds, 4);
    assert.ok(distance(poseAt(ACT_TWO, a.t0).pos, poseAt(ACT_TWO, a.t1 - 1e-6).pos) < 1e-6);
    assert.ok(distance(poseAt(ACT_TWO, s.t1 - 1e-9).pos, scene.camera.pos) < 1e-3);
    // A short distance: the lens does not travel across the room.
    assert.ok(distance(arrive.camera.pos, scene.camera.pos) < 6);
  }
});

test('the caption comes up only after the camera has stopped', () => {
  for (let i = 0; i <= 400; i++) {
    for (const m of moments((ACT_TWO.seconds * i) / 400)) {
      for (const key of ['arrive', 'scene', 'cut', 'card']) assert.ok(m[key] >= 0 && m[key] <= 1, `${key} ${m[key]}`);
      if (m.card > 0) assert.equal(m.cut, 0);
    }
  }
  assert.equal(moments(0.01)[0].cut, 1);
  assert.equal(moments(0.01)[0].card, 0);
  assert.equal(moments(ACT_TWO.seconds).at(-1).card, 1);
});
