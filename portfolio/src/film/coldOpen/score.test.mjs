import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLD_OPEN, IMPACT, LIFT, SHORT_START, T, score } from './score.js';
import { SHOTS } from '../shots.js';

const steps = Array.from({ length: 421 }, (_, i) => (T.end * i) / 420);

test('three shots: black, the signal, hand over, under four seconds', () => {
  const ids = SHOTS.filter((shot) => shot.act === 'CO').map((shot) => shot.id);
  assert.deepEqual(ids, ['CO-01', 'CO-02', 'CO-03']);
  assert.ok(0 < T.ignite && T.ignite < T.open && T.open < T.end);
  assert.ok(T.end < 5);
  assert.equal(COLD_OPEN.seconds, T.end);
  assert.equal(IMPACT, T.ignite);
  assert.ok(T.end - LIFT > T.ignite);
});

test('a returning visitor sees the lit point for under a second', () => {
  assert.ok(SHORT_START > T.ignite + 0.2);
  assert.ok(T.end - SHORT_START < 1);
});

test('it opens on black and ends fully lifted', () => {
  const first = score(0);
  assert.equal(first.core, 0);
  assert.equal(first.flare, 0);
  assert.equal(first.veil, 1);
  const last = score(T.end);
  assert.equal(last.veil, 0);
  assert.equal(last.gone, 1);
});

test('the point eases in over 200 ms, and the flare decays while the point stays', () => {
  assert.equal(score(T.ignite + 0.2).core, 1);
  assert.ok(score(T.ignite + 0.1).core < 1);
  assert.ok(score(T.ignite + 1.2).flare < score(T.ignite + 0.2).flare / 2);
  assert.equal(score(T.end - LIFT).core, 1);
});

test('every value stays in a sane range and the layer only lifts', () => {
  let veil = 1;
  for (const t of steps) {
    const now = score(t);
    for (const key of ['core', 'gone', 'veil']) assert.ok(now[key] >= 0 && now[key] <= 1, `${key} = ${now[key]} at ${t}`);
    for (const key of ['flare', 'bloom', 'aberration']) assert.ok(now[key] >= 0 && now[key] < 2, `${key} = ${now[key]} at ${t}`);
    assert.ok(now.veil <= veil + 1e-9);
    veil = now.veil;
  }
  assert.ok(score(T.end).aberration < 0.001);
});
