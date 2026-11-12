// What the home page leads with. projects.js holds every project's full
// story; this file only picks the order and writes the short, sharp version
// of each one for the home page. Every number here comes from the project's
// own stats, report or case study, so check there before changing one.
//
// House style: plain words, short sentences, no em dashes.

// The seven flagship case studies, in order. `visual` is the optional second
// image that floats over the cover art: a real screenshot or figure ("shot"),
// or a short illustrated terminal ("terminal") for tools that have no screen
// of their own. Leave it out and the cover fills the frame on its own.
export const FLAGSHIPS = [
  {
    slug: "saywhen",
    eyebrow: "Open source · desktop app",
    badge: "New · open source beta",
    headline: "Look at the screen. Say the command. It types it, and can press Enter.",
    copy: "Voice input for terminals and coding assistants with no hotkey. The webcam notices you are facing the screen and talking, speech becomes text on your own computer, and every send waits behind a preview you can cancel.",
    stats: [["34/34", "spoken commands cleaned exactly"], ["0%", "false starts on 56 replay clips"], ["4", "ways to send, all cancelable"]],
    stack: ["Tauri", "Rust", "TypeScript", "MediaPipe", "Whisper"],
  },
  {
    slug: "jarvis",
    eyebrow: "Autonomous agent",
    badge: "Running on my Mac",
    headline: "A personal AI agent that runs itself, on a budget, and remembers everything.",
    copy: "It checks job postings against my profile, researches companies and ideas, reviews my GitHub repos and keeps a record of every run. Calls and spend are capped, and a large test suite keeps it honest.",
    stats: [["453", "automated tests"], ["20", "AI calls a day, hard cap"], ["$0", "extra running cost"]],
    stack: ["Claude Code", "Python", "SQLite", "GitHub Actions"],
    visual: { type: "shot", src: "/shots/jarvis/dashboard.webp", caption: "Dashboard, sample data" },
  },
  {
    slug: "agent-flight-recorder",
    eyebrow: "Open source · on PyPI",
    badge: "Open source",
    headline: "A black box recorder for coding agents.",
    copy: "When an agent breaks the build, the final error rarely says which edit caused it. Flight Recorder logs every tool call, file change and failure locally, then names the suspect edit with the diff and the evidence behind it.",
    stats: [["5/5", "reference failures traced"], ["0", "core dependencies"], ["3", "ways to inspect a run"]],
    stack: ["Python", "SQLite", "MCP", "Codex"],
    visual: {
      type: "terminal",
      title: "flight-recorder · timeline",
      lines: [
        ["dim", "tool_call   read   auth/session.py"],
        ["dim", "tool_call   edit   auth/session.py"],
        ["dim", "tool_call   run    tests"],
        ["bad", "failure     test_refresh_token"],
        ["good", "suspect     edit #2 removed the expiry check"],
        ["dim", "evidence    diff + failing assertion saved"],
      ],
      caption: "Illustration of a recorded run",
    },
  },
  {
    slug: "prh-jepa",
    eyebrow: "Research replication",
    badge: "Full technical report",
    headline: "I re-ran a LeCun paper on one laptop, then found what the score was hiding.",
    copy: "The paper claims image and text models trained apart learn the same space up to one rotation. On a 16 GB Mac I passed 135 of 139 released tests, matched all six open baselines within 0.0012, and traced 35% of the top model's score to a hidden clip.",
    stats: [["6/6", "open baselines reproduced"], ["135/139", "released tests passed"], ["−35%", "score without the hidden clip"]],
    stack: ["PyTorch", "Hugging Face", "DINOv2", "pandas"],
    visual: { type: "shot", src: "/p/prh-jepa/fig2-wit1024-baselines.svg", caption: "Figure 2 from the report", light: true },
  },
  {
    slug: "haloscript",
    eyebrow: "Native app · App Store",
    badge: "Live on the App Store",
    headline: "A writing studio for novelists, on Mac, iPad and iPhone.",
    copy: "Write the story next to an endless whiteboard. Plan scenes on a corkboard, keep a bible of characters and places, sketch with Apple Pencil, and sync it all through iCloud. Designed, built and shipped solo.",
    stats: [["3", "Apple platforms"], ["Live", "on the App Store"], ["Solo", "design to release"]],
    stack: ["Swift", "SwiftUI", "SwiftData", "CloudKit", "PencilKit"],
    visual: { type: "shot", src: "/shots/haloscript/hero_home_mac.jpg", caption: "Haloscript on the Mac" },
  },
  {
    slug: "digital-double",
    eyebrow: "AI + 3D",
    badge: "Live demo",
    headline: "A 3D double of my head, directed with AI from 13 seconds of video.",
    copy: "Phone photos and a short clip in, an explorable 3D head out. I directed Claude Code through Blender and photogrammetry tools, tried 12 approaches, and shipped the one whose eyes follow you around the page.",
    stats: [["12", "approaches tried"], ["13 s", "of phone video"], ["$0", "spent on tools"]],
    stack: ["Claude Code", "Blender", "MCP", "three.js"],
  },
  {
    slug: "site-recon",
    eyebrow: "Open-source agent skill",
    badge: "Open source",
    headline: "Point an agent at any website. Get back how it is built and how it moves.",
    copy: "Site Recon inspects a public page on desktop, mobile and reduced-motion profiles, saves the exact animation values the browser sees, keeps facts apart from guesses, and helps rebuild the technique with original code.",
    stats: [["3", "browser profiles per run"], ["4", "evidence files per extraction"], ["2", "agent hosts supported"]],
    stack: ["Playwright", "Node.js", "Agent Skills", "Claude Code"],
    visual: {
      type: "terminal",
      title: "site-recon · inspect",
      lines: [
        ["dim", "profile     desktop · mobile · reduced motion"],
        ["dim", "capture     DOM, motion, assets"],
        ["good", "fact        hero fades in over 600 ms"],
        ["warn", "guess       likely a scroll-linked timeline"],
        ["dim", "saved       4 evidence files"],
        ["good", "next        rebuild with original code"],
      ],
      caption: "Illustration of an inspection",
    },
  },
];

// The rest of the shipped work, as image cards. `metric` is optional.
export const MORE_WORK = [
  { slug: "decision-models", metric: "+16", unit: "points over a larger AI", line: "The best small model routed support tickets better than a larger one, and ran 5× faster on the same laptop." },
  { slug: "rea-study", metric: "2.3×", unit: "the cost, no clear gain", line: "An independent test of a reverse-engineering tool for agents on 20 programs, with the null result published in full." },
  { slug: "storyera", metric: "53", unit: "chapters in the first audit", line: "An agent skill that checks a novel for continuity, cites every passage and leaves the author in control." },
  { slug: "authorized-web-exposure-audit", metric: "7", unit: "findings, zero real targets", line: "A security audit skill that refuses to run without a written scope, proven on a safe local fixture." },
  { slug: "analytics-assistant", metric: "30", unit: "questions, both scored", line: "Hand-written rules against a local LLM on the same six MCP tools, measured side by side." },
  { slug: "catalogue-checker", metric: "50", unit: "planted errors to catch", line: "Three ways to spot misfiled products, from embeddings to zero-shot, each scored against hidden mistakes." },
  { slug: "integration", metric: "10", unit: "failures, each with a fix", line: "OAuth and OpenID Connect between two systems, broken on purpose ten ways and documented like production." },
  { slug: "data-delivery", line: "A dbt and Dagster pipeline that merges messy weekly files and refuses to ship unless every check passes." },
  { slug: "sitescout", line: "A Chrome side-panel extension that collects market data for any ticker and exports one clean file." },
  { slug: "reptrack", line: "A fast workout log for the gym floor. Native Swift, live on the App Store." },
];

// What I do, with the projects that prove it.
export const CAPABILITIES = [
  {
    id: "agents",
    count: "4",
    unit: "open-source agent tools",
    title: "Agents & tooling",
    copy: "Agents that can run on their own and still be trusted: memory, spend limits, test suites and a full record of what they did.",
    proof: ["jarvis", "agent-flight-recorder", "site-recon", "storyera"],
  },
  {
    id: "evals",
    count: "3",
    unit: "published AI studies",
    title: "Evaluation & research",
    copy: "A demo is not evidence. I design the eval, publish the method and every run, and report the result even when it is a null.",
    proof: ["prh-jepa", "rea-study", "decision-models"],
  },
  {
    id: "product",
    count: "2",
    unit: "apps live on the App Store",
    title: "Product & shipping",
    copy: "From idea to release: native Swift apps, browser extensions, data pipelines and 3D on the web, designed and shipped end to end.",
    proof: ["haloscript", "reptrack", "digital-double", "data-delivery"],
  },
];

// The moving row of tools under the intro.
export const STACK_MARQUEE = [
  "Claude API", "Claude Code", "MCP", "PyTorch", "Hugging Face", "Ollama", "Playwright",
  "Python", "TypeScript", "Swift", "SwiftUI", "React", "three.js", "DuckDB", "dbt", "Dagster",
  "SQLite", "Snowflake", "Tauri", "Rust",
];
