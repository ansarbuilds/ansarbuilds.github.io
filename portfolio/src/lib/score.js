/* The film's music, as data: each act's chord progression, tempo and
   texture. lib/sound.js plays it with oscillators in the browser, so there
   are no audio files. Pure, tested (score.test.mjs).

   The whole score lives around D major, the way a launch film sits in one
   home key and colours it act by act:
     act1    the receipts: warm and open, a slow piano figure
     act2    seven builds: the relative minor, a soft pulse, more motion
     act3    three monoliths: low and wide, a drum on each chord
     act4    the playground: lydian, floating, the piano up high
     finale  comes home to D and holds there

   Chords are MIDI notes, lowest first. The lowest is the bass. */

export const SCORE = {
  act1: {
    bar: 5.2, steps: 8, density: 0.55, pulse: null, padLevel: 1, arpOctave: 12,
    chords: [
      [50, 57, 61, 64, 66], // Dmaj9
      [47, 54, 57, 61, 62], // Bm9
      [43, 50, 54, 57, 61], // Gmaj7#11
      [45, 52, 57, 59, 64], // Asus2
    ],
  },
  act2: {
    bar: 4, steps: 8, density: 0.9, pulse: "soft", padLevel: 0.85, arpOctave: 12,
    chords: [
      [47, 54, 59, 61, 62], // Bm(add9)
      [43, 50, 55, 59, 62], // G
      [42, 50, 57, 62, 66], // D/F#
      [45, 52, 57, 61, 64], // A
    ],
  },
  act3: {
    bar: 6, steps: 6, density: 0.45, pulse: "drum", padLevel: 1.1, arpOctave: 12,
    chords: [
      [40, 47, 54, 55, 59], // Em9
      [36, 43, 52, 55, 59], // Cmaj7
      [43, 50, 55, 59, 62], // G
      [42, 50, 54, 57, 62], // D/F#
    ],
  },
  act4: {
    bar: 5, steps: 8, density: 0.7, pulse: null, padLevel: 0.9, arpOctave: 24,
    chords: [
      [43, 50, 54, 59, 61], // Gmaj7(#11 colour)
      [45, 52, 57, 61, 64], // A/G feel
      [40, 47, 55, 59, 62], // Em7
      [45, 49, 52, 57, 64], // A
    ],
  },
  finale: {
    bar: 4.5, steps: 8, density: 0.4, pulse: null, padLevel: 1, arpOctave: 12, hold: true,
    chords: [
      [43, 50, 55, 59, 66], // Gmaj7
      [45, 52, 57, 61, 64], // A
      [38, 50, 57, 61, 64, 66], // Dmaj9, home
    ],
  },
};

export const ACT_NAMES = Object.keys(SCORE);

export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// The piano figure: which chord tone each step of a bar plays, climbing and
// turning back, so it reads as a melody and not a scale.
const FIGURE = [0, 2, 4, 2, 1, 3, 4, 3];

/* The note the piano plays at a step of a chord, or null for a rest.
   Deterministic: the same step of the same chord always plays the same, so
   a visitor scrolling back hears the same music. */
export function arpNote(act, chordIndex, step) {
  const part = SCORE[act];
  if (!part) return null;
  const chord = part.chords[chordIndex % part.chords.length];
  // A fixed pseudo-random draw per step decides rests by the act's density.
  const draw = ((chordIndex * 7 + step * 13 + 3) % 17) / 17;
  if (step !== 0 && draw >= part.density) return null;
  const upper = chord.slice(1);
  const tone = upper[FIGURE[step % FIGURE.length] % upper.length];
  return tone + part.arpOctave;
}

// Which chord plays at a given bar of an act. The finale stops on its last.
export function chordAt(act, bar) {
  const part = SCORE[act];
  if (!part) return null;
  const n = part.chords.length;
  return part.hold ? Math.min(bar, n - 1) : bar % n;
}
