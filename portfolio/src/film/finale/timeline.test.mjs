import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_AT, FINALE, moments, timeAtProgress } from './timeline.js';
import { FINALE_CONTACT_AT, FINALE_SCREENS } from './screens.js';

const steps = Array.from({ length: 301 }, (_, i) => (FINALE.seconds * i) / 300);

test('the page sizes the finale, and finds its contact beat, from the real timeline', () => {
  assert.equal(moments(timeAtProgress(CONTACT_AT)).contact, 1);
  assert.ok(Math.abs(FINALE.screens - FINALE_SCREENS) < 1e-9, `${FINALE.screens}`);
  assert.ok(Math.abs(CONTACT_AT - FINALE_CONTACT_AT) < 1e-9, `${CONTACT_AT}`);
  assert.equal(timeAtProgress(1), FINALE.seconds);
});

test('the signal comes first, then the line, and it ends settled', () => {
  for (const t of steps) {
    const m = moments(t);
    // (shock is -1 while there is none.)
    for (const [key, v] of Object.entries(m)) assert.ok(key === 'shock' ? v === -1 || (v >= 0 && v <= 1) : v >= 0 && v <= 1, key);
    if (m.contact > 0) assert.equal(m.core, 1);
  }
  assert.equal(moments(FINALE.seconds).contact, 1);
});

test('the point gathers, then bursts once as the line lands, and settles', async () => {
  const { LAND } = await import('./timeline.js');
  assert.equal(moments(LAND - 0.01).burst, 0);
  assert.ok(moments(LAND - 0.1).gather > 0.8);
  assert.equal(moments(LAND).burst, 1);
  assert.ok(moments(LAND + 0.4).shock > 0);
  assert.equal(moments(FINALE.seconds).shock, -1);
  assert.ok(moments(FINALE.seconds).burst < 0.01);
});
