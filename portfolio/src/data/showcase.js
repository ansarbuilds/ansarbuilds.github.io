// What the home page leads with. projects.js holds every project's full
// story; this file only picks the order and writes the short, sharp version
// of each one for the home page. Every number here comes from the project's
// own stats, report or case study, so check there before changing one.
//
// House style: plain words, short sentences, no em dashes.

// The six flagship case studies, in order. `visual` is the optional second
// image that floats over the cover art: a real screenshot or figure ("shot"),
// or a short illustrated terminal ("terminal") for tools that have no screen
// of their own. Leave it out and the cover fills the frame on its own.
export const FLAGSHIPS = [
  {
    slug: "hedwig",
    eyebrow: "Open source · LLM from scratch",
    badge: "New · runs in your browser",
    headline: "My try at building a ChatGPT-style model from scratch, from a MacBook Air to 286.7M knobs for $2.45.",
    copy: "Plain PyTorch, why the Mac hit a wall, why rented GPUs ran 26× faster, and how Hedwig compares to GPT and Claude.",
    stats: [["286.7M", "parameters, largest model"], ["$2.45", "total cloud spend"], ["98.3%", "DPO win-rate"]],
    stack: ["PyTorch", "JavaScript", "RunPod", "Hugging Face"],
    visual: { type: "shot", src: "/p/hedwig/mac-app.jpg", caption: "The Mac app with the Brain X-Ray" },
  },
  {
    slug: "saywhen",
    eyebrow: "Open source · Mac and Windows",
    badge: "Beta · v0.3.0",
    headline: "Look at the screen and talk. It types, then waits before it sends.",
    copy: "Hands-free dictation for Mac and Windows. The webcam and the microphone have to agree. Speech stays on your computer. Snippets, quiet hours, and a new window are in the unsigned v0.3.0 beta.",
    stats: [["34/34", "spoken commands cleaned exactly"], ["0%", "false starts on 56 replay clips"], ["4", "ways to send, all cancelable"]],
    stack: ["Tauri", "Rust", "TypeScript", "MediaPipe", "Whisper"],
  },
  {
    slug: "jarvis",
    eyebrow: "Autonomous agent",
    badge: "Running on my Mac",
    headline: "A personal AI agent that runs itself, on a budget, and remembers everything.",
    copy: "It checks job postings, researches companies and reviews my repos, with capped spend and a large test suite.",
    stats: [["453", "automated tests"], ["20", "AI calls a day, hard cap"], ["$0", "extra running cost"]],
    stack: ["Claude Code", "Python", "SQLite", "GitHub Actions"],
    visual: { type: "shot", src: "/shots/jarvis/dashboard.webp", caption: "Dashboard, sample data" },
  },
  {
    slug: "agent-flight-recorder",
    eyebrow: "Open source · on PyPI",
    badge: "Open source",
    headline: "A black box recorder for coding agents.",
    copy: "It logs every tool call and file change locally, then names the edit that broke the build, with the evidence.",
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
    copy: "On a 16 GB Mac: 135 of 139 tests passed, six baselines matched within 0.0012, and 35% of the top score traced to a hidden clip.",
    stats: [["6/6", "open baselines reproduced"], ["135/139", "released tests passed"], ["−35%", "score without the hidden clip"]],
    stack: ["PyTorch", "Hugging Face", "DINOv2", "pandas"],
    visual: { type: "shot", src: "/p/prh-jepa/fig2-wit1024-baselines.svg", caption: "Figure 2 from the report", light: true },
  },
  {
    slug: "haloscript",
    eyebrow: "Native app · App Store",
    badge: "Live on the App Store",
    headline: "A writing studio for novelists, on Mac, iPad and iPhone.",
    copy: "An endless whiteboard beside the manuscript, a corkboard, Apple Pencil and iCloud sync. Designed, built and shipped solo.",
    stats: [["3", "Apple platforms"], ["Live", "on the App Store"], ["Solo", "design to release"]],
    stack: ["Swift", "SwiftUI", "SwiftData", "CloudKit", "PencilKit"],
    visual: { type: "shot", src: "/shots/haloscript/hero_home_mac.jpg", caption: "Haloscript on the Mac" },
  },
];

// The rest of the shipped work, as image cards. `metric` is optional.
// `art` is each card's evidence poster, drawn from the project's own
// numbers by scripts/make-more-art.mjs.
export const MORE_WORK = [
  { slug: "decision-models", art: "/shots/more/decision-models.webp", metric: "+16", unit: "points over a larger AI", line: "The best small model routed support tickets better than a larger one, and ran 5× faster on the same laptop." },
  { slug: "rea-study", art: "/shots/more/rea-study.webp", metric: "2.3×", unit: "the cost, no clear gain", line: "An independent test of a reverse-engineering tool for agents on 20 programs, with the null result published in full." },
  { slug: "storyera", art: "/shots/more/storyera.webp", metric: "53", unit: "chapters in the first audit", line: "An agent skill that checks a novel for continuity, cites every passage and leaves the author in control." },
  { slug: "reptrack", art: "/shots/more/reptrack.webp", line: "A fast workout log for the gym floor. Native Swift, live on the App Store." },
];

// What I do, with the projects that prove it.
export const CAPABILITIES = [
  {
    id: "agents",
    count: "3",
    unit: "agent tools",
    title: "Agents & tooling",
    copy: "Agents that can run on their own and still be trusted: memory, spend limits, test suites and a full record of what they did.",
    proof: ["jarvis", "agent-flight-recorder", "storyera"],
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
    copy: "From idea to release: native apps on the App Store and tools on the desktop, designed and shipped end to end.",
    proof: ["haloscript", "reptrack", "saywhen"],
  },
];

// The moving row of tools under the intro.
export const STACK_MARQUEE = [
  "Claude API", "Claude Code", "MCP", "PyTorch", "Hugging Face", "Ollama", "Playwright",
  "Python", "TypeScript", "Swift", "SwiftUI", "React", "three.js", "DuckDB", "dbt", "Dagster",
  "SQLite", "Snowflake", "Tauri", "Rust",
];
