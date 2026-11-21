/* The film, shot by shot.

   This one list is the storyboard (the /storyboard/ page draws a frame per
   shot from it) and the camera path (the /previs/ page flies it), so the
   board and the moving pre-vis can never disagree about order or timing.

   Per shot:
     id       act code + number, used in links and review notes ("A2-03")
     title    what the shot is
     seconds  how long it runs at playing speed
     scroll   screens of scrolling it takes. 0 means it plays on its own
              (the cold open); everything else is driven by the scrollbar.
     cut      true when the shot starts on a hard cut. Otherwise the camera
              arrives in one continuous move from the shot before.
     camera   where the camera ends up: pos, the point it looks at, and the
              lens (fov, degrees). `move` names the move for the board;
              `ease` paces it ("out" or "inOut", see rig.js).
     action   what happens on screen
     text     words on screen, set as a title card
     sound    what is heard (sound is off until the visitor turns it on)
     bars     true while the 2.39:1 letterbox bars are closed
     frame    which drawing the storyboard uses (see Frame.jsx)

   World units are arbitrary. The signal starts at the origin and the film
   travels down -Z; each project set sits to one side of that line.

   House style for the words: plain, short sentences, no em dashes. */

export const ACTS = [
  { id: "CO", title: "Cold open", note: "Black, one point of light, then the hero. About 3.6 seconds on a first visit, can be skipped. A returning visitor gets only the hand-over." },
  { id: "A1", title: "Act I · The line", note: "One sentence in the dark, one slow drift forward. About one screen of scrolling." },
  { id: "A2", title: "Act II · Two builds", note: "saywhen and Digital Me. Each opens on a hard cut held on a finished frame, eases in a short way, then holds. The hold is the poster." },
  { id: "FN", title: "Finale · Contact", note: "The signal returns, then one line and one button. Bookend to the cold open." },
  { id: "PG", title: "Project pages", note: "Not on the main timeline. Plays when a project is opened or closed." },
];

// Where each project's set stands. Only the two the film plays are listed.
export const SETS = {
  saywhen: { label: "saywhen", at: [-34, 0, -190] },
  "digital-double": { label: "Digital double", at: [32, 0, -590] },
  point: { label: "The signal, again", at: [0, 0, -1080] },
};

// Act I's one prop: a very dim river of code low in the frame.
export const ACT_ONE = {
  river: { y: -16, from: 60, to: -210, width: 46 },
};

// A project's two beats. The camera stands straight in front of the set, so
// the set's own space and the world differ only by its place. Arrival: a hard
// cut onto a finished frame, held. Scene: a short ease in, then the hold.
function projectShots(n, slug, { arrive, scene, fov, action, caption, push, sound, frame }) {
  const at = SETS[slug].at;
  const code = String(n).padStart(2, "0");
  const add = ([x, y, z]) => [at[0] + x, at[1] + y, at[2] + z];
  return [
    { id: `A2-${code}a`, act: "A2", slug, title: `${SETS[slug].label}: arrive`, seconds: 1.6, scroll: 0.35, cut: true, camera: { pos: add(arrive.pos), look: add(arrive.look), fov, move: "Hard cut, held" }, action: `Hard cut onto the finished frame, held. No title card.`, sound: "One low tone on the cut", bars: false, frame: "tunnel" },
    { id: `A2-${code}b`, act: "A2", slug, title: `${SETS[slug].label}: the scene`, seconds: 4, scroll: 0.85, camera: { pos: add(scene.pos), look: add(scene.look), fov, ease: "out", move: push }, action, text: caption, sound, bars: false, frame },
  ];
}

export const SHOTS = [
  // ---- Cold open ----
  { id: "CO-01", act: "CO", title: "Black", seconds: 0.8, scroll: 0, cut: true, camera: { pos: [0, 0, 3], look: [0, 0, 0], fov: 32, move: "Locked off" }, action: "Nothing. Carbon black, the same as the hero. The bars are open.", sound: "Silence", bars: false, frame: "black" },
  { id: "CO-02", act: "CO", title: "The signal", seconds: 1.6, scroll: 0, camera: { pos: [0, 0, 3], look: [0, 0, 0], fov: 32, move: "Locked off" }, action: "One point of light, dead centre. One soft warm flare, then it decays. The point stays.", sound: "A single soft tone", bars: false, frame: "point" },
  { id: "CO-03", act: "CO", title: "Hand over", seconds: 1.2, scroll: 0, camera: { pos: [0, 0, 3], look: [0, 0, 0], fov: 32, move: "Locked off" }, action: "The point holds, then the layer lifts and the hero is underneath, already in place.", sound: "Silence", bars: false, frame: "open" },

  // ---- Act I ----
  { id: "A1-01", act: "A1", title: "The line", seconds: 2.5, scroll: 1, camera: { pos: [0, 0.4, -7], look: [0, 0, -40], fov: 40, move: "A slow drift forward" }, action: "One sentence in the dark. A very dim river of code runs low in the frame and never crosses the words.", text: "Most AI demos stop at the demo.", sound: "Silence", bars: false, frame: "numbers" },

  // ---- Act II ----
  ...projectShots(1, "saywhen", {
    arrive: { pos: [0.3, 0.2, 22], look: [0.3, -4.4, 0] },
    scene: { pos: [0.3, 0.1, 18.5], look: [0.3, -4.4, 0] },
    fov: 32,
    push: "Short push toward the monitor, then hold",
    caption: "Look at the screen. Say the command. It types it, and can press Enter.",
    action: "A dark room. The only light is the monitor showing the real product. A life-size head made of points, in profile, faces it. A waveform runs from the mouth to the screen and the command types in. The lower third stays empty for the caption.",
    sound: "A low tone on the cut",
    frame: "monitor",
  }),
  ...projectShots(2, "digital-double", {
    arrive: { pos: [0, 0.6, 15], look: [0, -0.5, 0] },
    scene: { pos: [0, 0.6, 11.5], look: [0, -0.5, 0] },
    fov: 28,
    push: "Eye level, a slow push, then hold",
    caption: "Made from the real model. It looks back at you.",
    action: "The real head, large, lit by a warm key and a thin cool rim. It looks just off camera. Its build stages run in a small strip behind it, out of focus.",
    sound: "A low tone on the cut",
    frame: "head",
  }),

  // ---- Finale ----
  { id: "FN-01", act: "FN", title: "The signal returns", seconds: 1.5, scroll: 0.4, camera: { pos: [0, 0, -1074], look: [0, 0, -1080], fov: 32, move: "Locked off" }, action: "Black. The same point of light as the open, with the same warm flare.", sound: "The opening tone, once", bars: false, frame: "recede" },
  { id: "FN-02", act: "FN", title: "The line", seconds: 3, scroll: 0.8, camera: { pos: [0, 0, -1074], look: [0, 0, -1080], fov: 32, move: "Locked off" }, action: "One line in the title face and one button. The address in small type under it, then GitHub and LinkedIn as quiet links, and one credit line.", text: "Let's build something.", sound: "Silence", bars: false, frame: "contact" },

  // ---- Project pages (off the main timeline) ----
  { id: "PG-01", act: "PG", title: "Dive into a project", seconds: 1.2, scroll: 0, offTimeline: true, camera: { pos: [0, 0, 0], look: [0, 0, -1], fov: 30, move: "Push through the set's screen" }, action: "Clicking a project sends the camera into that set. The screen in the scene grows until it is the header of the project page.", sound: "Short rush", bars: false, frame: "dive" },
  { id: "PG-02", act: "PG", title: "Back out", seconds: 1, scroll: 0, offTimeline: true, camera: { pos: [0, 0, 0], look: [0, 0, -1], fov: 30, move: "Pull back to the same spot" }, action: "Back returns the camera to the exact place on the timeline it left from.", sound: "The rush, reversed", bars: false, frame: "dive" },
];

export const TIMELINE_SHOTS = SHOTS.filter((shot) => !shot.offTimeline);
export const shotsInAct = (act) => SHOTS.filter((shot) => shot.act === act);
export const runtime = (shots) => shots.reduce((total, shot) => total + shot.seconds, 0);
