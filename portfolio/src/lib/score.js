/* The film's music, as data: each act's chord progression, tempo and
   texture. lib/sound.js plays it with oscillators in the browser, so there
   are no audio files. Pure, tested (score.test.mjs).

   An original score in the manner of a big space film's trailer: a church
   organ in a long hall, a high figure that ticks like a clock, low strings
   driving under it and trailer drums. The whole score sits around A minor,
   and every act is a few seconds of a trailer, so the chords move fast:
     act1    the receipts: the strings start, a drum on each bar
     act2    seven builds: everything at full drive, the clock ticking
     act3    three monoliths: the organ at its biggest
     act4    the playground: F lydian, the figure up high
     finale  climbs home and lands on A major, and holds there

   Chords are MIDI notes, lowest first. The lowest is the bass. */

export const SCORE = {
  act1: {
    bar: 3.2, steps: 8, density: 0.7, pulse: null, tick: false, drive: true, drums: "build", padLevel: 1.3, arpOctave: 12,
    chords: [
      [45, 52, 57, 59, 64], // Am(add9)
      [41, 48, 57, 60, 64], // Fmaj7
      [48, 55, 60, 62, 64], // C(add9)
      [43, 50, 55, 59, 62], // G
    ],
  },
  act2: {
    bar: 2.4, steps: 8, density: 1, pulse: null, tick: true, drive: true, drums: "full", padLevel: 1.2, arpOctave: 12,
    chords: [
      [45, 52, 57, 60, 64], // Am
      [41, 48, 53, 57, 60], // F
      [48, 52, 55, 60, 64], // C
      [43, 50, 55, 59, 62], // G
    ],
  },
  act3: {
    bar: 3.2, steps: 8, density: 0.7, pulse: null, tick: false, drive: true, drums: "full", padLevel: 1.5, arpOctave: 12,
    chords: [
      [41, 48, 53, 57, 60], // F
      [40, 48, 52, 55, 60], // C/E
      [38, 45, 50, 53, 57], // Dm
      [45, 52, 57, 60, 64], // Am
    ],
  },
  act4: {
    bar: 2.8, steps: 8, density: 0.9, pulse: null, tick: true, drive: true, drums: "full", padLevel: 1.3, arpOctave: 24,
    chords: [
      [41, 48, 55, 57, 59], // F(#11)
      [43, 50, 55, 59, 62], // G
      [40, 47, 55, 59, 62], // Em7
      [45, 52, 57, 60, 64], // Am
    ],
  },
  finale: {
    bar: 2.4, steps: 8, density: 0.6, pulse: null, tick: false, drive: false, drums: "build", padLevel: 1.6, arpOctave: 12, hold: true,
    chords: [
      [41, 48, 57, 60, 64], // Fmaj7
      [43, 50, 55, 59, 62], // G
      [45, 52, 57, 61, 64, 69], // A major, home
    ],
  },
};

export const ACT_NAMES = Object.keys(SCORE);

export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// The organ's high figure: which chord tone each step of a bar plays. It
// rocks between a low and a high tone and walks the high one up, so it
// ticks forward like a clock rather than running a scale.
const FIGURE = [0, 3, 1, 3, 0, 4, 2, 4];

/* The note the figure plays at a step of a chord, or null for a rest.
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
