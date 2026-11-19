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
  { id: "CO", title: "Cold open", note: "Plays once on a first visit, about 8 seconds, can be skipped. A returning visitor gets shots CO-05 to CO-07 only, about 1.5 seconds." },
  { id: "A1", title: "Act I · The short version", note: "The camera goes through the name. The four numbers are objects it passes." },
  { id: "A2", title: "Act II · Selected work", note: "Six sets, one per project. Each is pinned for about a screen of scrolling. A light-speed streak joins them; nothing fades." },
  { id: "A3", title: "Act III · What I bring", note: "Three monoliths: agents, research, shipping." },
  { id: "A4", title: "Act IV · The playground", note: "The effects reel: solar system, infinity ribbon, the 3D head, BB-8." },
  { id: "FN", title: "Finale · Contact", note: "Everything returns to one point. Bookend to the cold open." },
  { id: "PG", title: "Project pages", note: "Not on the main timeline. Plays when a project is opened or closed." },
];

// Where each project's set stands. Sides alternate so the path weaves.
export const SETS = {
  saywhen: { label: "saywhen", at: [-34, 0, -190] },
  jarvis: { label: "Jarvis", at: [36, 4, -270] },
  "agent-flight-recorder": { label: "Flight Recorder", at: [-32, -4, -350] },
  "prh-jepa": { label: "PRH-JEPA", at: [34, 2, -430] },
  haloscript: { label: "Haloscript", at: [-34, 3, -510] },
  "digital-double": { label: "Digital double", at: [32, 0, -590] },
  monoliths: { label: "Three monoliths", at: [0, 0, -690] },
  star: { label: "Star", at: [0, 0, -780] },
  solar: { label: "Solar system", at: [0, 0, -860] },
  ribbon: { label: "Infinity ribbon", at: [26, 6, -930] },
  head: { label: "3D head + BB-8", at: [-22, 0, -990] },
  point: { label: "The signal, again", at: [0, 0, -1080] },
};

// Act I's props, along the first stretch of the path. The camera passes the
// numbers during A1-02 and ends A1-03 looking at the tools. Values and
// labels come from the page's own data (content.js), not from here.
export const ACT_ONE = {
  // The name stands where the cold open left it, across the origin.
  name: { at: [0, 0, 0], width: 40 },
  numbers: [[11, 0, -80], [-11, 0, -94], [11, 0, -108], [-11, 0, -120]],
  river: { y: -7, from: 60, to: -210, width: 46 },
  tools: { at: [-12, 1, -168], rings: [6, 10, 14] },
};

const near = ([x, y, z], dx, dy, dz) => [x + dx, y + dy, z + dz];
// A project's two beats: arrive wide on the set, then push in on its screen.
function projectShots(n, slug, { title, action, push, sound, frame }) {
  const at = SETS[slug].at;
  const side = Math.sign(at[0]) || 1;
  const code = String(n).padStart(2, "0");
  return [
    { id: `A2-${code}a`, act: "A2", slug, title: `${SETS[slug].label}: arrive`, seconds: 2.5, scroll: 0.5, camera: { pos: near(at, -side * 26, 5, 46), look: at, fov: 38, ease: "out", move: "Streak in, settle wide" }, action: `Light-speed streak ends on the set. Title card: ${title}.`, text: SETS[slug].label.toUpperCase(), sound: "Whoosh, then the room tone of this set", bars: true, frame: "tunnel" },
    { id: `A2-${code}b`, act: "A2", slug, title: `${SETS[slug].label}: the scene`, seconds: 5, scroll: 1, camera: { pos: near(at, -side * 7, 1.5, 15), look: near(at, 0, 0.5, 0), fov: 30, move: push }, action, sound, bars: false, frame },
  ];
}

export const SHOTS = [
  // ---- Cold open ----
  { id: "CO-01", act: "CO", title: "Black", seconds: 0.8, scroll: 0, cut: true, camera: { pos: [0, 0, 3], look: [0, 0, 0], fov: 32, move: "Locked off" }, action: "Nothing. Letterbox bars are closed. A small \"sound on\" pill sits in the corner.", sound: "Low hum fades up", bars: true, frame: "black" },
  { id: "CO-02", act: "CO", title: "The signal ignites", seconds: 1, scroll: 0, camera: { pos: [0, 0, 3], look: [0, 0, 0], fov: 32, move: "Locked off" }, action: "One pixel of light appears dead centre. A lens flare blooms across the frame.", sound: "A single soft tone", bars: true, frame: "point" },
  { id: "CO-03", act: "CO", title: "Heartbeat", seconds: 1.4, scroll: 0, camera: { pos: [0, 0, 6], look: [0, 0, 0], fov: 32, move: "Slow creep back" }, action: "The point pulses twice. Each beat throws out faint lines: the first nodes of a graph.", sound: "Two heartbeats", bars: true, frame: "pulse" },
  { id: "CO-04", act: "CO", title: "Pull back", seconds: 1.6, scroll: 0, camera: { pos: [0, 4, 78], look: [0, 0, 0], fov: 40, ease: "out", move: "Fast dolly out, motion blur" }, action: "The camera rushes backwards. Thousands of nodes appear: an agent network shaped like a nebula.", sound: "Rising rush", bars: true, frame: "network" },
  { id: "CO-05", act: "CO", title: "The name", seconds: 1.6, scroll: 0, camera: { pos: [0, 2, 70], look: [0, 0, 0], fov: 36, ease: "inOut", move: "Settle" }, action: "Signals race along the edges and converge. Particles assemble the name in 3D type, lit from behind.", text: "MOHAMED ANSAR", sound: "Impact, then a held chord", bars: true, frame: "name" },
  { id: "CO-06", act: "CO", title: "The line", seconds: 1, scroll: 0, cut: true, camera: { pos: [0, 2, 70], look: [0, 0, 0], fov: 36, move: "Locked off" }, action: "Hard cut to silence. One line types in under the name.", text: "I build agents, studies and apps. With proof.", sound: "Silence, key ticks", bars: true, frame: "subtitle" },
  { id: "CO-07", act: "CO", title: "The frame opens", seconds: 0.8, scroll: 0, camera: { pos: [0, 2, 70], look: [0, 0, 0], fov: 36, move: "Locked off, bars slide away" }, action: "The letterbox bars slide off. The frame fills the screen and becomes the hero. The nav fades in.", sound: "Soft release", bars: false, frame: "open" },

  // ---- Act I ----
  { id: "A1-01", act: "A1", title: "Through the name", seconds: 3, scroll: 0.8, camera: { pos: [0, 0, -18], look: [0, -1, -70], fov: 44, move: "Dolly forward, through the letters" }, action: "Scrolling starts the move. The camera passes between the letters and into the network behind them.", sound: "Air moving past", bars: false, frame: "through" },
  { id: "A1-02", act: "A1", title: "The four numbers", seconds: 4, scroll: 1, camera: { pos: [3, 1, -92], look: [0, -1, -140], fov: 42, move: "Glide past, slight drift" }, action: "Four numbers built from glowing cubes stand along the path and count up as the camera passes: 10+ projects, 2 open-source tools, 3 studies, 2 apps. Under the camera, lines of code flow like a river.", text: "Most AI demos stop at the demo.", sound: "A tick per count", bars: false, frame: "numbers" },
  { id: "A1-03", act: "A1", title: "The tools", seconds: 3, scroll: 0.7, camera: { pos: [0, 2, -142], look: [-20, 0, -185], fov: 40, move: "Arc left toward the first set" }, action: "The tools I build with orbit like satellites. Pointing at one pulls it toward the camera.", sound: "Faint orbit hum", bars: false, frame: "orbit" },

  // ---- Act II ----
  ...projectShots(1, "saywhen", { title: "Look at the screen. Say the command.", push: "Slow push to the monitor", action: "A dark room and a floating monitor. A face made of points turns toward it. A waveform rises from the mouth and becomes text that types onto the screen. The real launch film plays on that monitor.", sound: "A voice, then typing", frame: "monitor" }),
  ...projectShots(2, "jarvis", { title: "A personal AI agent that runs itself.", push: "Orbit a quarter turn around the core", action: "A control room at night. Panels of the real dashboard orbit a core. A gauge marked \"20 calls a day\" glows like a reactor limit.", sound: "Control-room hum", frame: "control" }),
  ...projectShots(3, "agent-flight-recorder", { title: "A black box recorder for coding agents.", push: "Push in as the box opens", action: "An aircraft black box in an orange spotlight. It comes apart into layers: tool calls, edits, the failure. The suspect edit flashes red and flies to the camera.", sound: "Cockpit beeps, one alarm", frame: "blackbox" }),
  ...projectShots(4, "prh-jepa", { title: "I re-ran a LeCun paper on one laptop.", push: "Slow orbit, then hold", action: "Two clouds of points, images and text, drift apart, then snap into line with one rotation. A light sweeps across and shows the hidden number: minus 35%.", sound: "A click as they align", frame: "clouds" }),
  ...projectShots(5, "haloscript", { title: "A writing studio for novelists.", push: "Turntable, half turn", action: "A Mac, an iPad and an iPhone as real models under studio light, turning slowly. Their screens show the actual app: the manuscript, the whiteboard, the corkboard.", sound: "Pencil on glass, pages", frame: "devices" }),
  ...projectShots(6, "digital-double", { title: "A 3D double of my head, from 13 seconds of video.", push: "Push in to eye level", action: "The head stands in a cone of light and looks at the visitor. Its twelve build stages hang behind it like a contact sheet.", sound: "Quiet room", frame: "head" }),

  // ---- Act III ----
  { id: "A3-01", act: "A3", title: "The monoliths rise", seconds: 3, scroll: 0.8, camera: { pos: [0, 10, -642], look: [0, 6, -690], fov: 36, move: "Low angle, tilt up" }, action: "Three monoliths rise out of the ground: agents, research, shipping.", text: "THREE THINGS, done properly.", sound: "Deep stone movement", bars: true, frame: "monoliths" },
  { id: "A3-02", act: "A3", title: "Orbit", seconds: 5, scroll: 1.2, camera: { pos: [31, 9, -716], look: [0, 7, -690], fov: 34, move: "Orbit right around the three" }, action: "The camera circles them. Project names are etched in each face and light up as they turn toward the camera.", sound: "One note per name", bars: false, frame: "orbitstones" },

  // ---- Act IV ----
  { id: "A4-01", act: "A4", title: "Collapse into a star", seconds: 2.5, scroll: 0.6, camera: { pos: [0, 3, -748], look: [0, 0, -780], fov: 40, move: "Pull back as it collapses" }, action: "The whole network falls inward and becomes a star.", sound: "Everything drawn in, then a bloom", bars: true, frame: "star" },
  { id: "A4-02", act: "A4", title: "The solar system", seconds: 4, scroll: 1, camera: { pos: [10, 8, -825], look: [0, 0, -860], fov: 38, move: "Fly in over the ecliptic" }, action: "The camera passes into the solar system: real orbits, lit planets, haze on the horizon of each one.", sound: "Wide, slow pad", bars: false, frame: "solar" },
  { id: "A4-03", act: "A4", title: "The ribbon", seconds: 3, scroll: 0.8, camera: { pos: [14, 8, -905], look: [26, 6, -930], fov: 42, move: "Ride along the curve" }, action: "An infinity loop made of light. The camera rides along it like a track.", sound: "Rising glide", bars: false, frame: "ribbon" },
  { id: "A4-04", act: "A4", title: "The head and BB-8", seconds: 4, scroll: 1, camera: { pos: [-14, 1.5, -966], look: [-22, 0.5, -990], fov: 32, move: "Slow push" }, action: "The 3D head in a cone of light. BB-8 rolls into frame and reacts to the pointer. The Emet terminal floats over the scene as a glass panel.", sound: "Droid chirp", bars: false, frame: "droid" },

  // ---- Finale ----
  { id: "FN-01", act: "FN", title: "Everything recedes", seconds: 3, scroll: 0.8, camera: { pos: [0, 2, -1020], look: [0, 0, -1080], fov: 36, move: "Hold while the world pulls away" }, action: "Every set the visitor passed shrinks back toward one point of light.", sound: "The score thins to one tone", bars: true, frame: "recede" },
  { id: "FN-02", act: "FN", title: "Contact", seconds: 4, scroll: 1, camera: { pos: [0, 0, -1074], look: [0, 0, -1080], fov: 32, move: "Creep in" }, action: "Black. One line in the title face. The email button glows like the first signal.", text: "Let's build something.", sound: "The opening tone, once", bars: true, frame: "contact" },
  { id: "FN-03", act: "FN", title: "Credits", seconds: 3, scroll: 0.6, camera: { pos: [0, 0, -1076], look: [0, 0, -1080], fov: 32, move: "Locked off" }, action: "A credits roll for the footer: the stack, the tools, \"Directed by Mohamed Ansar\".", sound: "Silence", bars: true, frame: "credits" },

  // ---- Project pages (off the main timeline) ----
  { id: "PG-01", act: "PG", title: "Dive into a project", seconds: 1.2, scroll: 0, offTimeline: true, camera: { pos: [0, 0, 0], look: [0, 0, -1], fov: 30, move: "Push through the set's screen" }, action: "Clicking a project sends the camera into that set. The screen in the scene grows until it is the header of the project page.", sound: "Short rush", bars: false, frame: "dive" },
  { id: "PG-02", act: "PG", title: "Back out", seconds: 1, scroll: 0, offTimeline: true, camera: { pos: [0, 0, 0], look: [0, 0, -1], fov: 30, move: "Pull back to the same spot" }, action: "Back returns the camera to the exact place on the timeline it left from.", sound: "The rush, reversed", bars: false, frame: "dive" },
];

export const TIMELINE_SHOTS = SHOTS.filter((shot) => !shot.offTimeline);
export const shotsInAct = (act) => SHOTS.filter((shot) => shot.act === act);
export const runtime = (shots) => shots.reduce((total, shot) => total + shot.seconds, 0);
