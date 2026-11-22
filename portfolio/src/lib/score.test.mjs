import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACT_NAMES, SCORE, arpNote, chordAt, hz } from './score.js';

test('every act that asks for music has a score', () => {
  assert.deepEqual(ACT_NAMES, ['act1', 'act2', 'act3', 'act4', 'finale']);
});

test('chords are voiced low to high, in a playable range, with a bass under them', () => {
  for (const [name, part] of Object.entries(SCORE)) {
    assert.ok(part.bar > 2 && part.steps > 0, name);
    for (const chord of part.chords) {
      assert.ok(chord.length >= 4, `${name}: thin chord`);
      for (let i = 1; i < chord.length; i++) assert.ok(chord[i] > chord[i - 1], `${name}: not low to high`);
      assert.ok(chord[0] >= 36 && chord.at(-1) <= 76, `${name}: out of range`);
    }
  }
});

test('the piano plays on every downbeat, in tune with its chord, and repeats exactly', () => {
  for (const name of ACT_NAMES) {
    const part = SCORE[name];
    part.chords.forEach((chord, c) => {
      assert.notEqual(arpNote(name, c, 0), null);
      for (let s = 0; s < part.steps; s++) {
        const note = arpNote(name, c, s);
        assert.equal(note, arpNote(name, c, s));
        if (note !== null) assert.ok(chord.some((tone) => (note - tone) % 12 === 0), `${name} ${c}/${s}: ${note} not in chord`);
      }
    });
  }
});

test('the acts loop, and the finale comes home and stays', () => {
  assert.equal(chordAt('act1', 4), 0);
  const last = SCORE.finale.chords.length - 1;
  assert.equal(chordAt('finale', 99), last);
  assert.deepEqual(SCORE.finale.chords[last][0] % 12, 2); // D
  assert.equal(Math.round(hz(69)), 440);
});
