// What the site says, and which projects it shows.
//
// This file is the home page's single source: the intro, the story, what I
// am building now, the shipped work and the contact details. Each project's
// full facts live in projects.js; anything here that is a number comes from
// that entry or from the project's own repository, so check there before
// changing one.
//
// House style: first person, short sentences, plain words, no em dashes.
// No "Situation / Task / Action / Result" labels: each story is four short
// paragraphs that read the way I would say them.

// The only projects the site lists, in order. Every other project keeps its
// page at /work/<slug>/ for old links, but is left out of every list, the
// sitemap and search engines.
export const LISTED_SLUGS = ["hermione", "saywhen", "haloscript", "agent-flight-recorder", "sirius"];
export const isListed = (slug) => LISTED_SLUGS.includes(slug);

// Repositories that are private for now. Links to them are left off the site
// (a visitor would get a 404). Remove a name here the day it goes public.
export const PRIVATE_REPOS = ["Hermione", "sirius", "haloscript", "decision-models"];
const PRIVATE_PATTERN = new RegExp(`github\\.com/ansarbuilds/(${PRIVATE_REPOS.join("|")})(\\.git)?(/|$)`, "i");
export const isPublicLink = (href = "") => !PRIVATE_PATTERN.test(href);

export const PERSON = {
  name: "Mohamed Ansar",
  role: "Solutions engineer",
  place: "Canada",
  email: "mohamedansarkms@gmail.com",
  github: "https://github.com/ansarbuilds",
  linkedin: "https://www.linkedin.com/in/kmsmohamedansar/",
};

// The intro: about seven seconds, once per visit. Who I am, what I build,
// and what I am working on now. Each beat holds for `ms`.
export const INTRO_BEATS = [
  { id: "name", ms: 1700, text: "Mohamed Ansar" },
  { id: "what", ms: 2300, text: "I build software that runs on your machine, not someone else's." },
  { id: "now", ms: 2000, text: "Three apps shipped. Building Sirius now." },
];

export const HERO = {
  kicker: "Mohamed Ansar · Solutions engineer · Canada",
  title: ["Software that runs", "on your machine,", "not someone else's."],
  lede: "I build local-first apps and small AI models that work offline and keep your data on your device. Then I ship them, with the numbers to show they work.",
};

// The story, in my words. Shown right under the hero.
export const STORY = {
  title: "Who I am",
  paragraphs: [
    "I'm a solutions engineer in Canada. My day work is making data systems people can trust. The rest of my time goes into building the tools I wish I had.",
    "Most of them share one idea: your work should live on your own computer. A project tracker that is one file on your Mac. Voice input that never sends a picture or a word to a server. A writing app that syncs through your own iCloud and nobody else's.",
    "I use AI coding tools to move fast. I still own the problem, the tests and the final call, and I publish what failed next to what worked.",
  ],
};

// What I am building right now.
export const NOW = {
  slug: "sirius",
  label: "Building now",
  title: "Sirius",
  line: "A focus aid for ADHD that runs entirely on your Mac.",
  copy: [
    "When I drift from work into a rabbit hole, I rarely notice for twenty minutes. Every focus app I tried either blocked whole sites or asked me to label everything first.",
    "Sirius reads only the title of the window in front of me and asks two small models of my own whether it fits what I'm working on. Each is 32 MB and answers in about 7 ms on the CPU, with no network call. If I drift for two minutes, it checks in once, gently, and offers a way back.",
  ],
  stats: [
    ["14/14", "real-world test titles judged right (v2)"],
    ["0", "false nudges while on task"],
    ["32.5 MB", "per model, int8 ONNX"],
  ],
  status: "v0.2 beta · in progress",
  note: "Sirius is a focus aid. It does not diagnose or treat ADHD.",
  shot: { src: "/shots/sirius/drifting-dark.webp", w: 1600, h: 1217, alt: "Sirius noticing a drift: the focus trajectory drops from on task to drifting while a YouTube video is in front." },
  inset: { src: "/shots/sirius/check-in.webp", w: 900, h: 574, alt: "The gentle check-in card: still on App Development, Hermione? with a button back to the file you were in." },
  links: [
    { label: "Try the models in your browser", href: "https://huggingface.co/spaces/ansarbuilds/sirius-demo", primary: true },
    { label: "Models on Hugging Face", href: "https://huggingface.co/ansarbuilds/Sirius-Core" },
  ],
};

// The three spotlights. `star` is the story in four short paragraphs: what
// was wrong, what I set out to do, what I built, how it turned out. Stats
// for Hermione are read from its projects.js entry so they stay in step with
// that project's own page.
export const SHIPPED = [
  {
    slug: "hermione",
    index: "01",
    tag: "Mac app · on-device AI",
    line: "Jira and Confluence as one file on your Mac, with a small AI model that runs offline.",
    star: [
      "Teams pay per seat for issue trackers and wikis, and every ticket lives on someone else's server. I wanted the board, the backlog, the sprints and the handbook as a single local file.",
      "The hard part was the assistant. A model small enough to run on an 8 GB Mac had to drive the app's own tools exactly, offline, every time.",
      "I built the app in Tauri, Rust and TypeScript. Then I generated thousands of practice requests, fine-tuned a 2B model on rented GPUs, and set a release gate on unseen requests that decided what shipped.",
      "Two models passed the gate and ship signed with the app. A larger one failed it and was held back automatically.",
    ],
    statsFrom: "project",
    stack: ["Tauri", "Rust", "TypeScript", "llama.cpp", "Unsloth"],
    shot: { src: "/shots/hermione/board-dark.jpg", w: 1400, h: 900, alt: "Hermione's sprint board in dark mode, with issues in columns." },
  },
  {
    slug: "saywhen",
    index: "02",
    tag: "Mac and Windows · open source",
    line: "Look at the screen and talk. It types, then waits before it sends.",
    star: [
      "I talk to coding assistants all day. Every voice tool made me press a key to start and Enter to finish, or it listened to the whole room.",
      "I wanted the computer to know when I'm talking to it, without a hotkey, and never send something I didn't mean.",
      "The webcam and the microphone have to agree before it listens. Whisper turns speech into text on the device, a clean-up pass turns \"dash dash release\" into --release, and every send waits on a preview I can cancel with Esc, a head shake or \"scratch that\".",
      "It's my first open-source app: a Mac and Windows beta at v0.3.0. On my replay test it cleans 34 of 34 spoken commands exactly, with no false starts.",
    ],
    stats: [
      ["34/34", "spoken commands cleaned exactly"],
      ["0%", "false starts on 56 replay clips"],
      ["v0.3.0", "beta for Mac and Windows"],
    ],
    stack: ["Tauri", "Rust", "TypeScript", "MediaPipe", "Whisper"],
    shot: { src: "/p/saywhen/app-dark.webp", w: 1600, h: 1114, alt: "saywhen's main window: Ready when you are, with the four ways to send." },
  },
  {
    slug: "haloscript",
    index: "03",
    tag: "Mac, iPad and iPhone · App Store",
    line: "A writing studio for novelists, with a whiteboard beside the manuscript.",
    star: [
      "I write novels on the side, and I was juggling a word processor, a corkboard app, a notes app and a folder of screenshots.",
      "I wanted one app for the writing and the planning, on every Apple device, with nothing stored on a server of mine.",
      "I built it as one SwiftUI app for Mac, iPad and iPhone, with SwiftData on the device and CloudKit syncing through the writer's own iCloud. Apple Pencil works on the whiteboard. The hardest part was keeping sync safe when two devices edit at once.",
      "It's my second App Store app, live on all three platforms. No accounts, no ads, no analytics.",
    ],
    stats: [
      ["3", "Apple platforms, one codebase"],
      ["~30k", "lines of Swift in this app"],
      ["0", "accounts, ads or trackers"],
    ],
    stack: ["Swift", "SwiftUI", "SwiftData", "CloudKit", "PencilKit"],
    shot: { src: "/shots/haloscript/hero_home_mac.jpg", w: 1400, h: 875, alt: "Haloscript on the Mac: What shall we make today? Novel or Whiteboard." },
    gallery: [
      { src: "/shots/haloscript/write_mac.jpg", alt: "The scene editor on the Mac", caption: "Write" },
      { src: "/shots/haloscript/corkboard_mac.jpg", alt: "The corkboard on the Mac", caption: "Corkboard" },
      { src: "/shots/haloscript/whiteboard_mac.jpg", alt: "The whiteboard on the Mac", caption: "Whiteboard" },
      { src: "/shots/haloscript/board_ipad.jpg", alt: "The whiteboard on iPad with Apple Pencil", caption: "iPad and Apple Pencil" },
      { src: "/shots/haloscript/write_iphone.jpg", alt: "Writing on iPhone", caption: "iPhone", tall: true },
    ],
  },
];

// The rest of the shipped work.
export const MORE = [
  {
    slug: "agent-flight-recorder",
    tag: "Python package · open source",
    title: "Agent Flight Recorder",
    line: "When a coding agent breaks a test, it shows you which edit did it.",
    copy: "A local timeline of every tool call and file change an agent makes. On a failure it ranks the earlier edits and shows the likely culprit with its diff and the reasons. On PyPI, with a CLI, a local web view and MCP tools.",
    stats: [["v1.1.1", "on PyPI"], ["0", "core dependencies"], ["5/5", "reference failures traced"]],
    links: [
      { label: "Code on GitHub", href: "https://github.com/ansarbuilds/agent-flight-recorder", primary: true },
      { label: "pip install flightrecorder-ai", href: "https://pypi.org/project/flightrecorder-ai/" },
    ],
  },
];

export const HOW_I_WORK = {
  title: "How I work",
  points: [
    ["Start with a real problem.", "Every project here began as something that annoyed me. If I wouldn't use it, I don't ship it."],
    ["Keep it on the device.", "Local storage, on-device models, your own iCloud. A server has to earn its place."],
    ["Measure before I claim.", "Each number on this page comes from a test I can rerun, and the limits sit next to it."],
  ],
  tools: [
    ["Apps", "Swift, SwiftUI, Tauri, Rust, TypeScript, React"],
    ["On-device AI", "PyTorch, Unsloth, llama.cpp, ONNX, Whisper"],
    ["Data", "SQL, Python, DuckDB, SQLite"],
    ["Working with agents", "Claude Code, Codex, MCP"],
  ],
};

export const CONTACT = {
  title: "Say hi.",
  line: "A question about a project, something you're building, or a role you think I'd fit. I read everything.",
};
