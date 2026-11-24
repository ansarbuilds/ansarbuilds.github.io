/* The film's cut list, at 30 frames a second: every shot in order, how long
   it holds, what it shows, and the sound on its cut. One file for the
   pictures (Film.jsx) and the score (score/record.mjs), so they cannot
   drift apart. Every number on screen comes from the portfolio's own
   project data (portfolio/src/data/projects.js). */

export const FPS = 30;

// kind: type (a word slammed full screen), term (a command typed), title (a
// project's title card), clip (footage), stat (a number slammed), device
// (a screenshot in its frame), trio (all three devices), end. Each
// project's own shots: train, tokens and receipts (Hedwig); listen, clean
// and send (saywhen); halo, morph and sync (Haloscript); more (the end).
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

  // Hedwig: a training run, the reel's own shots, the model writing for real,
  // and the receipts.
  { chapter: "hedwig", kind: "train", frames: 42, command: "./hedwig --train", number: "01", name: "Hedwig", line: "A language model, built from scratch", params: 286700000, tint: "#e8b04a", riser: 1.2, hit: "braam" },
  { chapter: "hedwig", kind: "clip", frames: 16, src: "hedwig-reel.mp4", from: 1.6, hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 14, src: "hedwig-reel.mp4", from: 3.7, hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 14, src: "hedwig-reel.mp4", from: 6.3, hit: "drum" },
  { chapter: "hedwig", kind: "tokens", frames: 36, count: 22, tint: "#e8b04a", hit: "whoosh", ticks: 22 },
  { chapter: "hedwig", kind: "clip", frames: 18, src: "hedwig-reel.mp4", from: 12.6, label: ["286.7M", "parameters, from random numbers"], hit: "drum" },
  { chapter: "hedwig", kind: "receipts", frames: 26, value: "$2.45", label: "all three cloud runs", rows: ["286.7M parameters in 115 minutes", "on one rented RTX 4090"], tint: "#e8b04a", hit: "impact" },
  { chapter: "hedwig", kind: "stat", frames: 16, value: "98.3%", label: "preference win-rate after DPO", tint: "#e8b04a", hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 14, src: "hedwig-reel.mp4", from: 15.1, hit: "drum" },
  { chapter: "hedwig", kind: "clip", frames: 22, src: "hedwig-reel.mp4", from: 16.9, hit: "whoosh" },

  // saywhen: the camera and the microphone agreeing before it listens, the
  // film's own shots, spoken words cleaned into commands, and the send.
  // `cues` are extra sounds inside a shot, at a frame.
  { chapter: "saywhen", kind: "listen", frames: 44, command: "saywhen --listen", number: "02", name: "saywhen", line: "Hands-free voice input for developers", signals: ["FACE", "LIPS", "VOICE"], states: ["Waiting", "Ready", "Listening"], tint: "#f2a93b", riser: 1.0, hit: "braam", cues: [[8, "tick"], [13, "tick"], [18, "tick"]] },
  { chapter: "saywhen", kind: "clip", frames: 14, src: "saywhen-demo.mp4", from: 2.6, hit: "drum" },
  { chapter: "saywhen", kind: "clip", frames: 16, src: "saywhen-demo.mp4", from: 6.4, hit: "drum" },
  { chapter: "saywhen", kind: "clean", frames: 42, rows: [["cargo test dash dash release", "cargo test --release", "dash dash release", "--release"], ["cubectal get pods", "kubectl get pods", "cubectal", "kubectl"], ["git push dash dash force", "git push --force", "dash dash force", "--force", "typed with a warning, never sent"]], tint: "#f2a93b", hit: "whoosh", cues: [[11, "tick"], [23, "tick"], [35, "tick"]] },
  { chapter: "saywhen", kind: "clip", frames: 14, src: "saywhen-demo.mp4", from: 18.4, hit: "drum" },
  { chapter: "saywhen", kind: "send", frames: 30, app: "Terminal", text: "cargo test --release", enterAt: 19, tint: "#f2a93b", hit: "drum", cues: [[19, "impact"]] },
  { chapter: "saywhen", kind: "stat", frames: 16, value: "34/34", label: "spoken commands cleaned exactly", tint: "#f2a93b", hit: "drum" },
  { chapter: "saywhen", kind: "clip", frames: 18, src: "saywhen-demo.mp4", from: 53.2, hit: "whoosh" },

  // Haloscript: the app opens and its halo lights, one app turning from a
  // Mac into an iPad into an iPhone, its own screens, a word syncing to every
  // device through the writer's iCloud, and the App Store.
  { chapter: "haloscript", kind: "halo", frames: 38, command: "open Haloscript.app", number: "03", name: "Haloscript", line: "A writing studio for novelists", tint: "#c9b8ff", riser: 1.0, hit: "braam" },
  { chapter: "haloscript", kind: "device", frames: 14, src: "halo-whiteboard-mac.jpg", device: "mac", zoom: true, hit: "drum" },
  { chapter: "haloscript", kind: "morph", frames: 32, screens: [["halo-home-mac.jpg", "mac", "Mac"], ["halo-write-ipad.jpg", "ipadUp", "iPad"], ["halo-write-iphone.jpg", "iphone", "iPhone"]], line: "One app. Three screens.", tint: "#c9b8ff", hit: "whoosh", cues: [[11, "drum"], [22, "drum"]] },
  { chapter: "haloscript", kind: "device", frames: 12, src: "halo-corkboard-ipad.jpg", device: "ipad", hit: "drum" },
  { chapter: "haloscript", kind: "sync", frames: 30, word: "Chapter One", promises: ["No accounts", "No server of mine", "No tracking"], tint: "#c9b8ff", hit: "drum", cues: [[13, "tick"], [16, "tick"]] },
  { chapter: "haloscript", kind: "trio", frames: 32, stamp: "Live on the App Store", stampAt: 12, tint: "#c9b8ff", hit: "drum", cues: [[12, "impact"]] },

  // The end.
  // The end, the opening's mirror: out of the tunnel, the terminal asked
  // again, the name slams in over the three projects, and the screen
  // switches off like an old tube.
  { chapter: "end", kind: "more", frames: 22, small: "THERE'S", big: "MORE.", riser: 0.7, hit: "impact" },
  { chapter: "end", kind: "end", frames: 54, command: "whoami", name: "MOHAMED ANSAR", slamAt: 14, url: "ansarbuilds.dev", projects: [["01", "Hedwig", "#e8b04a"], ["02", "saywhen", "#f2a93b"], ["03", "Haloscript", "#c9b8ff"]], hit: "tick", cues: [[14, "finale"]] },
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
