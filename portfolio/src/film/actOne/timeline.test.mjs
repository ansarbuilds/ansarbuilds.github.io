import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_ONE, LAYOUT, countAt, endOf, numberProgress, overlays, startOf, timeAtProgress } from './timeline.js';
import { poseAt } from '../rig.js';
import { ACT_ONE_SCREENS } from './screens.js';

const cameraZ = (t) => poseAt(ACT_ONE, t).pos[2];

test('the act opens on the cold open\'s last frame and ends on A1-03', () => {
  const first = poseAt(ACT_ONE, 0);
  assert.deepEqual(first.pos, [0, 2, 70]);
  assert.equal(poseAt(ACT_ONE, ACT_ONE.seconds).entry.shot.id, 'A1-03');
  assert.equal(timeAtProgress(0), 0);
  assert.equal(timeAtProgress(1), ACT_ONE.seconds);
});

test('the camera goes through the name during A1-01', () => {
  assert.ok(cameraZ(startOf('A1-01')) > LAYOUT.name.at[2]);
  assert.ok(cameraZ(endOf('A1-01') - 1e-6) < LAYOUT.name.at[2]);
});

test('every number has fully counted by the end of A1-02, and none before A1-02', () => {
  for (const [, , z] of LAYOUT.numbers) {
    assert.equal(numberProgress(cameraZ(startOf('A1-02')), z), 0, `number at ${z} started early`);
    assert.equal(numberProgress(cameraZ(endOf('A1-02') - 1e-6), z), 1, `number at ${z} not landed`);
  }
});

test('the camera only moves forward through the act', () => {
  let last = Infinity;
  for (let i = 0; i <= 400; i++) {
    const z = cameraZ((ACT_ONE.seconds * i) / 400);
    assert.ok(z <= last + 1e-6, `went back at step ${i}`);
    last = z;
  }
});

test('the tools are ahead of the camera, in front of it, at the end', () => {
  const pose = poseAt(ACT_ONE, ACT_ONE.seconds);
  const to = LAYOUT.tools.at.map((v, i) => v - pose.pos[i]);
  const look = pose.look.map((v, i) => v - pose.pos[i]);
  const cos = (to[0] * look[0] + to[1] * look[1] + to[2] * look[2]) / (Math.hypot(...to) * Math.hypot(...look));
  assert.ok(cos > Math.cos((pose.fov / 2) * Math.PI / 180), 'tools outside the frame');
});

test('counting', () => {
  assert.equal(countAt('10+', 0), '0');
  assert.equal(countAt('10+', 0.5), '8');
  assert.equal(countAt('10+', 0.999), '10');
  assert.equal(countAt('10+', 1), '10+');
  assert.equal(countAt('3', 1), '3');
  const seen = new Set();
  for (let i = 0; i <= 100; i++) seen.add(countAt('3', i / 100));
  assert.deepEqual([...seen], ['0', '1', '2', '3']);
});

test('overlays stay in range and the statement leaves before the tools arrive', () => {
  for (let i = 0; i <= 300; i++) {
    const values = overlays((ACT_ONE.seconds * i) / 300);
    for (const value of Object.values(values)) assert.ok(value >= 0 && value <= 1);
  }
  assert.equal(overlays(startOf('A1-02') + 1.5).statement, 0);
  assert.equal(overlays(startOf('A1-02')).tools, 0);
});

test('the page sizes the act from the real timeline', () => {
  assert.ok(Math.abs(ACT_ONE.screens - ACT_ONE_SCREENS) < 1e-9, `screens.js says ${ACT_ONE_SCREENS}, the timeline ${ACT_ONE.screens}`);
});

test('the warp through the name rises and falls back to nothing', async () => {
  const { overlays, startOf, ACT_ONE } = await import('./timeline.js');
  assert.equal(overlays(0).warp, 0);
  const peak = overlays(startOf('A1-01') + 1.45).warp;
  assert.ok(peak > 0.95, `${peak}`);
  assert.ok(Math.abs(overlays(ACT_ONE.seconds).warp) < 1e-9);
});
