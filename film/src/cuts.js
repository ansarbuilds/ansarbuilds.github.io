/* The film's cut list, at 30 frames a second: every shot in order, how long
   it holds, what it shows, and the sound on its cut. One file for the
   pictures (Film.jsx) and the score (score/record.mjs), so they cannot
   drift apart. Every number on screen comes from the portfolio's own
   project data (portfolio/src/data/projects.js). */

export const FPS = 30;

// kind: type (a word slammed full screen), term (a command typed), title (a
// project's title card), clip (footage), stat (a number slammed), device
// (a screenshot in its frame), trio (all three devices), end.
// hit: the sound on the cut (drum, braam, impact, tick, whoosh, hit).
const SHOTS = [
  // Open: who, and what. A terminal boots and answers, the name slams in,
  // four words hit on the drum over a rising tunnel, and the three projects
  // are named before they play.
  { chapter: "open", kind: "boot", frames: 32, command: "whoami", answer: "mohamed ansar", hit: "tick" },
  { chapter: "open", kind: "slam", frames: 26, text: "MOHAMED ANSAR", hit: "impact" },
  { chapter: "open", kind: "word", frames: 10, text: "I BUILD", style: "zoom", riser: 1.4, hit: "drum" },
  { chapter: "open", kind: "word", frames: 10, text: "AGENTS.", style: "slice", accent: true, hit: "drum" },
  { chapter: "open", kind: "word", frames: 10, text: "STUDIES.", style: "drop", accent: true, hit: "drum" },
  { chapter: "open", kind: "word", frames: 10, text: "APPS.", style: "punch", accent: true, hit: "drum" },
  { chapter: "open", kind: "three", frames: 36, text: "HERE ARE THREE.", names: ["Hedwig", "saywhen", "Haloscript"], serif: "Watch.", hit: "impact" },

  // Hedwig.
  { chapter: "hedwig", kind: "title", frames: 32, command: "./hedwig --train", number: "01", name: "Hedwig", line: "A language model, built from scratch", tint: "#e8b04a", hit: "braam" },
  { chapter: "hedwig", kind: "clip", frames: 20, src: "hedwig-reel.mp4", from: 1.6, hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 16, src: "hedwig-reel.mp4", from: 3.7, hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 16, src: "hedwig-reel.mp4", from: 6.3, hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 20, src: "hedwig-reel.mp4", from: 12.6, label: ["286.7M", "parameters, from random numbers"], hit: "drum" },
  { chapter: "hedwig", kind: "stat", frames: 18, value: "$2.45", label: "total rented-GPU spend", tint: "#e8b04a", hit: "impact" },
  { chapter: "hedwig", kind: "clip", frames: 18, src: "hedwig-reel.mp4", from: 15.1, hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 24, src: "hedwig-reel.mp4", from: 16.9, hit: "whoosh" },

  // saywhen.
  { chapter: "saywhen", kind: "title", frames: 32, command: "saywhen --listen", number: "02", name: "saywhen", line: "Hands-free voice input for developers", tint: "#f2a93b", hit: "braam" },
  { chapter: "saywhen", kind: "clip", frames: 16, src: "saywhen-demo.mp4", from: 2.6, hit: "drum" },
  { chapter: "saywhen", kind: "clip", frames: 24, src: "saywhen-demo.mp4", from: 6.4, hit: "drum" },
  { chapter: "saywhen", kind: "clip", frames: 20, src: "saywhen-demo.mp4", from: 18.4, hit: "drum" },
  { chapter: "saywhen", kind: "clip", frames: 12, src: "saywhen-demo.mp4", from: 20.9, hit: "drum" },
  { chapter: "saywhen", kind: "clip", frames: 22, src: "saywhen-demo.mp4", from: 33.4, hit: "drum" },
  { chapter: "saywhen", kind: "stat", frames: 18, value: "34/34", label: "spoken commands cleaned exactly", tint: "#f2a93b", hit: "impact" },
  { chapter: "saywhen", kind: "clip", frames: 22, src: "saywhen-demo.mp4", from: 53.2, hit: "whoosh" },

  // Haloscript.
  { chapter: "haloscript", kind: "title", frames: 32, command: "open Haloscript.app", number: "03", name: "Haloscript", line: "A writing studio for novelists", tint: "#efe2ce", hit: "braam" },
  { chapter: "haloscript", kind: "device", frames: 22, src: "halo-home-mac.jpg", device: "mac", hit: "drum" },
  { chapter: "haloscript", kind: "device", frames: 18, src: "halo-whiteboard-mac.jpg", device: "mac", zoom: true, hit: "drum" },
  { chapter: "haloscript", kind: "device", frames: 16, src: "halo-corkboard-ipad.jpg", device: "ipad", hit: "drum" },
  { chapter: "haloscript", kind: "device", frames: 16, src: "halo-write-iphone.jpg", device: "iphone", hit: "drum" },
  { chapter: "haloscript", kind: "trio", frames: 32, stamp: "Live on the App Store", hit: "impact" },

  // The end.
  { chapter: "end", kind: "type", frames: 18, text: "THERE'S MORE.", hit: "drum" },
  { chapter: "end", kind: "end", frames: 48, hit: "finale" },
];

// Each shot with where it starts.
export const CUTS = [];
for (const [index, shot] of SHOTS.entries()) {
  const start = CUTS.at(-1)?.end ?? 0;
  CUTS.push({ ...shot, index, start, end: start + shot.frames });
}
export const TOTAL = CUTS.at(-1).end;

// The chapters, for the site's timeline: where each starts, as a share of
// the film, with its numeral and name.
const NAMES = { open: ["", "Opening"], hedwig: ["I", "Hedwig"], saywhen: ["II", "saywhen"], haloscript: ["III", "Haloscript"], end: ["", "Closing"] };
export const CHAPTERS = [];
for (const cut of CUTS) {
  if (CHAPTERS.some((c) => c.id === cut.chapter)) continue;
  CHAPTERS.push({ id: cut.chapter, at: cut.start / TOTAL, seconds: cut.start / FPS, numeral: NAMES[cut.chapter][0], name: NAMES[cut.chapter][1] });
}

// The music under each chapter (the score's sections, see the portfolio's
// lib/score.js).
export const BEDS = { open: "act1", hedwig: "act2", saywhen: "act2", haloscript: "act3", end: "finale" };
