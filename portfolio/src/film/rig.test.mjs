import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, SETS, SHOTS, TIMELINE_SHOTS } from './shots.js';
import { buildTimeline, entryAtTime, poseAt, scrollAtTime, timeAtScroll, timecode } from './rig.js';
import { BUILT } from './actTwo/built.js';

const timeline = buildTimeline(TIMELINE_SHOTS);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const EPS = 1e-4;

test('every shot is complete and has a unique id', () => {
  const acts = new Set(ACTS.map((act) => act.id));
  const seen = new Set();
  for (const shot of SHOTS) {
    assert.ok(!seen.has(shot.id), `duplicate id ${shot.id}`);
    seen.add(shot.id);
    assert.ok(acts.has(shot.act), `${shot.id}: unknown act`);
    assert.ok(shot.id.startsWith(shot.act), `${shot.id}: id does not match its act`);
    for (const key of ['title', 'action', 'sound', 'frame']) assert.ok(shot[key], `${shot.id}: no ${key}`);
    assert.ok(shot.seconds > 0, `${shot.id}: no duration`);
    assert.equal(shot.camera.pos.length, 3);
    assert.equal(shot.camera.look.length, 3);
    assert.ok(shot.camera.fov > 10 && shot.camera.fov < 90, `${shot.id}: lens out of range`);
    assert.ok(shot.camera.move, `${shot.id}: move not named`);
    assert.ok(distance(shot.camera.pos, shot.camera.look) > 0.5, `${shot.id}: camera sits on its own target`);
    assert.ok(!/—/.test(JSON.stringify(shot)), `${shot.id}: em dash`);
  }
});

test('Act II has one set per built project, in order', () => {
  const sets = [...new Set(SHOTS.filter((shot) => shot.act === 'A2').map((shot) => shot.slug))];
  assert.deepEqual(sets, BUILT);
  for (const slug of sets) assert.ok(SETS[slug], `${slug}: no set`);
});

test('the timeline runs forward with no gaps', () => {
  let time = 0, screens = 0;
  for (const entry of timeline.entries) {
    assert.equal(entry.t0, time);
    assert.equal(entry.s0, screens);
    assert.ok(entry.t1 > entry.t0 && entry.s1 > entry.s0);
    time = entry.t1; screens = entry.s1;
  }
  assert.equal(timeline.seconds, time);
  assert.equal(timeline.screens, screens);
});

test('scroll and time convert both ways', () => {
  for (let step = 0; step <= 200; step++) {
    const seconds = (timeline.seconds * step) / 200;
    assert.ok(Math.abs(timeAtScroll(timeline, scrollAtTime(timeline, seconds)) - seconds) < 1e-6);
  }
  assert.equal(timeAtScroll(timeline, -5), 0);
  assert.equal(timeAtScroll(timeline, timeline.screens + 5), timeline.seconds);
});

test('each shot ends on its own camera', () => {
  for (const entry of timeline.entries) {
    const pose = poseAt(timeline, entry.t1 - 1e-9);
    assert.ok(distance(pose.pos, entry.shot.camera.pos) < 1e-3, `${entry.shot.id}: position`);
    assert.ok(distance(pose.look, entry.shot.camera.look) < 1e-3, `${entry.shot.id}: target`);
  }
});

test('the camera is continuous between shots and jumps only on a cut', () => {
  for (const entry of timeline.entries.slice(1)) {
    const before = poseAt(timeline, entry.t0 - EPS);
    const after = poseAt(timeline, entry.t0 + EPS);
    const previous = timeline.entries[entry.index - 1].shot.camera;
    const moved = distance(previous.pos, entry.shot.camera.pos) > 1;
    if (entry.shot.cut && moved) assert.ok(distance(before.pos, after.pos) > 0.5, `${entry.shot.id}: cut did not jump`);
    else assert.ok(distance(before.pos, after.pos) < 0.05, `${entry.shot.id}: camera jumped ${distance(before.pos, after.pos)}`);
  }
});

test('a cut shot holds still', () => {
  for (const entry of timeline.entries.filter((candidate) => candidate.shot.cut)) {
    const start = poseAt(timeline, entry.t0 + EPS);
    const middle = poseAt(timeline, (entry.t0 + entry.t1) / 2);
    assert.ok(distance(start.pos, middle.pos) < 1e-6, `${entry.shot.id}: moved after a cut`);
  }
});

test('lookups and timecode', () => {
  assert.equal(entryAtTime(timeline, 0).shot.id, 'CO-01');
  assert.equal(entryAtTime(timeline, timeline.seconds + 10).shot.id, TIMELINE_SHOTS.at(-1).id);
  assert.equal(timecode(0), '00:00.0');
  assert.equal(timecode(83.44), '01:23.4');
});
