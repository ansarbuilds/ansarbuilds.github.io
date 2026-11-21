import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_ONE, overlays, timeAtProgress } from './timeline.js';
import { poseAt } from '../rig.js';
import { ACT_ONE_SCREENS } from './screens.js';

test('the act is one shot, a slow drift forward on a 40 degree lens', () => {
  assert.equal(ACT_ONE.entries.length, 1);
  const first = poseAt(ACT_ONE, 0), last = poseAt(ACT_ONE, ACT_ONE.seconds);
  assert.equal(last.fov, 40);
  assert.equal(timeAtProgress(0), 0);
  assert.equal(timeAtProgress(1), ACT_ONE.seconds);
  assert.ok(first.pos[2] >= last.pos[2]);
});

test('the camera only moves forward through the act', () => {
  let last = Infinity;
  for (let i = 0; i <= 200; i++) {
    const z = poseAt(ACT_ONE, (ACT_ONE.seconds * i) / 200).pos[2];
    assert.ok(z <= last + 1e-6, `went back at step ${i}`);
    last = z;
  }
});

test('the sentence is in range, and fully present for most of the act', () => {
  for (let i = 0; i <= 300; i++) {
    const { statement } = overlays((ACT_ONE.seconds * i) / 300);
    assert.ok(statement >= 0 && statement <= 1);
  }
  assert.equal(overlays(0).statement, 0);
  assert.equal(overlays(ACT_ONE.seconds).statement, 1);
  assert.equal(overlays(ACT_ONE.seconds * 0.5).statement, 1);
});

test('the page sizes the act from the real timeline', () => {
  assert.ok(Math.abs(ACT_ONE.screens - ACT_ONE_SCREENS) < 1e-9, `screens.js says ${ACT_ONE_SCREENS}, the timeline ${ACT_ONE.screens}`);
});
