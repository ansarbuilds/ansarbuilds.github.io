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

test('it recedes first, then contact, then the credits, and ends with everything settled', () => {
  for (const t of steps) {
    const m = moments(t);
    for (const v of Object.values(m)) assert.ok(v >= 0 && v <= 1);
    if (m.contact > 0) assert.equal(m.recede, 1);
    if (m.credits > 0) assert.equal(m.contact, 1);
  }
  const end = moments(FINALE.seconds);
  assert.equal(end.credits, 1);
  assert.equal(end.contact, 1);
});
