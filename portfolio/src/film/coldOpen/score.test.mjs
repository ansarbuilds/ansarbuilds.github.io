import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEATS, COLD_OPEN, IMPACT, SHORT_START, SUBTITLE, T, score } from './score.js';
import { SHOTS } from '../shots.js';

const steps = Array.from({ length: 821 }, (_, i) => (T.end * i) / 820);

test('the beats come in order and fit inside their shots', () => {
  assert.ok(0 < T.ignite && T.ignite < T.heart && T.heart < T.pull && T.pull < T.name && T.name < T.line && T.line < T.open && T.open < T.end);
  assert.ok(BEATS.every((at) => at > T.heart && at < T.pull));
  assert.ok(IMPACT > T.name && IMPACT < T.line);
  assert.ok(SHORT_START > T.pull && SHORT_START < T.name);
  assert.equal(COLD_OPEN.seconds, T.end);
});

test('it opens on black and ends fully lifted', () => {
  const first = score(0);
  assert.equal(first.core, 0);
  assert.equal(first.flare, 0);
  assert.equal(first.grow, 0);
  assert.equal(first.veil, 1);
  assert.equal(first.bars, true);
  const last = score(T.end);
  assert.equal(last.veil, 0);
  assert.equal(last.gone, 1);
  assert.equal(last.bars, false);
  assert.equal(last.typed, SUBTITLE.length);
});

test('the network only grows and the name only forms', () => {
  let grow = 0, form = 0;
  for (const t of steps) {
    const now = score(t);
    assert.ok(now.grow >= grow - 1e-9 && now.form >= form - 1e-9, `went backwards at ${t}`);
    grow = now.grow; form = now.form;
  }
  assert.ok(Math.abs(grow - 1) < 1e-9);
  assert.equal(form, 1);
  assert.equal(score(T.name).form, 0);
});

test('every value stays in a sane range', () => {
  for (const t of steps) {
    const now = score(t);
    for (const key of ['grow', 'form', 'lines', 'dust', 'rays', 'gone', 'veil']) assert.ok(now[key] >= 0 && now[key] <= 1, `${key} = ${now[key]} at ${t}`);
    for (const key of ['core', 'flare', 'bloom', 'aberration', 'signals']) assert.ok(now[key] >= 0 && now[key] < 4, `${key} = ${now[key]} at ${t}`);
  }
});

test('the hard cut clears the network and the line is the storyboard line', () => {
  assert.ok(score(T.line - 0.01).dust > 0.2);
  assert.ok(score(T.line).dust <= 0.1);
  assert.equal(score(T.line).lines, 0);
  assert.equal(SUBTITLE, SHOTS.find((shot) => shot.id === 'CO-06').text);
});

test('the sound cues fall inside the cold open, and the riser lands on the hit', async () => {
  const { CUES, IMPACT, T } = await import('./score.js');
  for (const c of CUES) assert.ok(c.at >= 0 && c.at <= T.end, c.kind);
  const hit = CUES.find((c) => c.kind === 'hit');
  assert.equal(hit.at, IMPACT);
  for (const riser of CUES.filter((c) => c.kind === 'riser')) assert.ok(Math.abs(riser.at + riser.length - IMPACT) < 1e-9);
});
