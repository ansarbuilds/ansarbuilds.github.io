/* Adaptive quality for the film's scenes.

   Each scene starts at a resolution picked for the device (see each
   pickQuality). If it then cannot keep up, measured over real frames, it
   steps down: three-quarters of the resolution at a time, to a floor, and
   last of all without the glow (bloom). It never steps back up, so a scene
   does not flicker between levels.

   frame(now, skip) is called once per rendered frame; pass skip for frames
   that are slow on purpose (an act that has finished draws a quarter of
   them), so they are not mistaken for a slow device. */
const SAMPLES = 90;
const SLOW_MS = 26; // a median over this, about 38 frames a second, is too slow
const FLOOR = 0.75;

export function createAdaptive({ quality, bloom, apply }) {
  let last = 0, samples = [], bloomOff = false, done = false;
  return {
    frame(now, skip = false) {
      if (done) return;
      // A long gap is a stalled or hidden tab, not a slow device.
      if (skip || !last || now - last > 250) { last = now; return; }
      samples.push(now - last);
      last = now;
      if (samples.length < SAMPLES) return;
      samples.sort((a, b) => a - b);
      const median = samples[SAMPLES >> 1];
      samples = [];
      if (median < SLOW_MS) return;
      if (quality.dpr > FLOOR + 0.01) {
        quality.dpr = Math.max(FLOOR, Math.round(quality.dpr * 75) / 100);
        apply();
        return;
      }
      if (bloom && !bloomOff) { bloom.enabled = false; bloomOff = true; return; }
      done = true;
    },
  };
}
