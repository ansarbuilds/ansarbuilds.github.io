// Site-wide copy: the hero, experience, skills, EMET's answers, contact
// details and command palette. Projects live in projects.js.
//
// House style: plain words, short sentences, first person, no em dashes.

export const HERO = {
  eyebrow: "Canada",
  title: "I build agents, test AI claims and ship apps.",
  lede: [
    { text: "I build agents that run on their own, tools that make coding agents debuggable, independent evaluations of AI claims, and native apps people download from the App Store. Everything ships with its code, its numbers and a full write-up, including what failed." },
  ],
};

// Quick proof, right under the intro, before anyone reads a paragraph.
export const RECEIPTS = [
  { value: "PROJECTS", label: "shipped projects with code, write-ups or live demos", accent: "green" },
  { value: "2", label: "open-source agent tools and skills, one on PyPI", accent: "cyan" },
  { value: "3", label: "independent AI studies with full technical reports", accent: "rose" },
  { value: "2", label: "native apps live on the App Store", accent: "amber" },
];

// A real count, not an estimate: lines added across the whole history of every
// repository on the account, public and private, by commits Mohamed authored,
// counting only hand-written source. Regenerate with `npm run count:loc` — the
// script explains what it counts, what it leaves out, and why.
// 39 repositories, counted 2026-11-05
export const CODE = {
  total: 143863,
  repos: 39,
  asOf: "Nov 2026",
  languages: [
    { name: "Swift", lines: 65023 },
    { name: "HTML", lines: 25609 },
    { name: "Python", lines: 15924 },
    { name: "JavaScript", lines: 13510 },
    { name: "CSS", lines: 7600 },
    { name: "Rust", lines: 6971 },
  ],
  // Libraries and frameworks the code imports, curated by hand from a scan of
  // every repository (manifests alone miss Swift frameworks and most Python),
  // most-used first. `repos` is how many repositories use it.
  tools: [
    { name: "SwiftUI", repos: 6 },
    { name: "SwiftData", repos: 4 },
    { name: "pandas", repos: 7 },
    { name: "Claude API", repos: 8 },
    { name: "React", repos: 3 },
    { name: "TypeScript", repos: 4 },
    { name: "Vite", repos: 4 },
    { name: "Hugging Face Transformers", repos: 3 },
    { name: "PyTorch", repos: 1 },
    { name: "MCP", repos: 1 },
    { name: "Playwright", repos: 3 },
    { name: "Tauri", repos: 1 },
    { name: "Flutter", repos: 1 },
    { name: "dbt", repos: 1 },
    { name: "Dagster", repos: 2 },
    { name: "DuckDB", repos: 2 },
    { name: "SQLite", repos: 8 },
    { name: "Streamlit", repos: 1 },
    { name: "LangChain", repos: 1 },
    { name: "Docker", repos: 1 },
  ],
};

export const SECTION_LINKS = [
  { id: "projects", label: "Selected work" },
  { id: "capabilities", label: "What I bring" },
  { id: "more", label: "More work" },
  { id: "ai", label: "Playground" },
  { id: "contact", label: "Contact" },
];

export const ABOUT = {
  title: "How I build",
  story: [
    "I learn by building. An idea becomes a small working thing, the small thing gets tested, and the result gets written up, failures included.",
    "Everything goes out in the open: the code, the reports, the saved runs and the limits. If it was worth building, it is worth sharing.",
  ],
  groups: [
    { title: "Data", accent: "cyan", items: ["SQL", "Snowflake", "BigQuery", "Python", "pandas", "DuckDB", "Airflow", "ETL and ELT"] },
    { title: "Building", accent: "green", items: ["Swift", "SwiftUI", "SwiftData", "React", "Next.js", "TypeScript", "three.js", "Docker", "Chrome extensions (MV3)"] },
    { title: "AI tools", accent: "violet", items: ["Claude Code", "Cursor", "MCP servers", "Local models with Ollama", "Hugging Face Transformers", "FAISS and embeddings", "Blender"] },
  ],
};

export const ROLES = [
  {
    company: "Datasembly",
    title: "Solutions Engineer",
    when: "Jan 2026 to now · Remote, Canada",
    current: true,
    accent: "cyan",
    summary: "Turning a client's question into data work that holds up, on a big retail pricing dataset.",
  },
  {
    company: "Datasembly",
    title: "Technical Support",
    when: "Aug 2024 to Dec 2025 · Remote, Canada",
    accent: "violet",
    summary: "Helped clients and coworkers get reliable answers from retail pricing data.",
  },
  {
    company: "Spongelii",
    compact: true,
    title: "Business Analyst Intern",
    when: "Jan to Apr 2024 · Remote, Canada",
    accent: "amber",
    summary: "Used data tools to turn business questions into reports and dashboards.",
  },
  {
    company: "Amazon Prime Video",
    title: "Business Analyst II, Quality Auditing",
    compact: true,
    when: "Oct 2021 to Aug 2022 · Hybrid, India",
    accent: "rose",
    summary: "Auditing how content operations worked, and fixing the gaps I found.",
  },
  {
    company: "Amazon Prime Video",
    title: "Business Analyst I, Digital Content",
    compact: true,
    when: "Aug 2019 to Sep 2021 · Hybrid, India",
    accent: "green",
    summary: "Keeping a large digital catalogue accurate and ready to publish.",
  },
];

// EMET answers as me, right in the terminal. `keywords` lets free text
// match a topic ("sql", "amazon"), and `go` is an optional "see more" link.
export const EMET_TOPICS = [
  {
    n: 1,
    label: "What do you do now?",
    go: "#experience",
    keywords: ["now", "current", "today", "sql", "snowflake", "datasembly", "job", "role"],
    answer: [
      { text: "I'm a solutions engineer at " },
      { text: "Datasembly", cls: "font-bold" },
      {
        text:
          ", since January 2026. I use SQL and Snowflake to work with retail pricing data, and help clients turn their questions into reports or tools they can rely on.",
      },
    ],
  },
  {
    n: 2,
    label: "Where have you worked?",
    go: "#experience",
    keywords: ["before", "worked", "history", "amazon", "spongelii", "experience", "past"],
    answer: [
      { text: "Datasembly", cls: "font-bold" },
      { text: " (solutions engineer, and tech support before that), " },
      { text: "Spongelii", cls: "font-bold" },
      { text: " (business analysis), and " },
      { text: "Amazon Prime Video", cls: "font-bold" },
      { text: " (quality auditing) before all of it. Each stop gave me a bit more technical ownership." },
    ],
  },
  {
    n: 3,
    label: "What have you built?",
    go: "#projects",
    keywords: ["shipped", "built", "projects", "ios", "app", "reptrack", "haloscript", "jarvis", "swift", "demo", "extension", "chrome", "study"],
    answer: [
      { text: "Start with " },
      { text: "Jarvis", cls: "font-bold" },
      { text: ", a personal AI agent that runs on my Mac. I also have two apps on the " },
      { text: "App Store", cls: "font-bold" },
      { text: " (Haloscript for novelists, RepTrack for workouts), " },
      { text: "three independent AI studies", cls: "font-bold" },
      {
        text:
          " with full technical reports, and open-source agent skills. Most have a live demo or a write-up.",
      },
    ],
  },
  {
    n: 4,
    label: "How do I reach you?",
    go: "#contact",
    keywords: ["reach", "contact", "email", "linkedin", "hire", "talk", "hello", "hi"],
    answer: [
      { text: "Email is fastest: " },
      { text: "mohamedansarkms@gmail.com", cls: "font-bold" },
      { text: ". I'm also on LinkedIn as " },
      { text: "kmsmohamedansar", cls: "font-bold" },
      { text: ". Say hi, I read everything." },
    ],
  },
];

export const CONTACT = {
  email: "mohamedansarkms@gmail.com",
  linkedin: "https://www.linkedin.com/in/kmsmohamedansar/",
  github: "https://github.com/kmsmohamedansar",
  // Drop a PDF in public/ and point this at it ("/mohamed-ansar-cv.pdf") to
  // show a CV link in Contact and the nav. Left empty, no link renders.
  resume: "",
};

export const COMMAND_ITEMS = [
  { label: "Selected work · six flagship builds", go: "#projects", group: "Sections" },
  { label: "What I bring · agents, evals, shipping", go: "#capabilities", group: "Sections" },
  { label: "More shipped work", go: "#more", group: "Sections" },
  { label: "Playground · interactive experiments", go: "#ai", group: "Sections" },
  { label: "Contact", go: "#contact", group: "Sections" },
  { label: "RepTrack, project page", go: "#project/reptrack", group: "Projects" },
  { label: "Jarvis, personal AI agent", go: "#project/jarvis", group: "Projects" },
  { label: "My Take on Jev, project page", go: "#project/decision-models", group: "Projects" },
  { label: "My Take on REA, project page", go: "#project/rea-study", group: "Projects" },
  { label: "My Take on PRH-JEPA, project page", go: "#project/prh-jepa", group: "Projects" },
  { label: "StoryEra, novel continuity skill", go: "#project/storyera", group: "Projects" },
  { label: "Haloscript, project page", go: "#project/haloscript", group: "Projects" },
  { label: "EMET · ask the terminal", go: "#emet", group: "Fun" },
  { label: "Solar system explorer", go: "#explore", group: "Fun" },
  { label: "A 3D model of me, made with AI", go: "#digital-double", group: "Fun" },
  { label: "RepTrack on the App Store", href: "https://apps.apple.com/us/app/reptrack-workout-log/id6761032027", group: "Links" },
  { label: "My Take on Jev, technical report", href: "/p/decision-models/report.html", group: "Links" },
  { label: "My Take on REA, technical report", href: "/p/rea-study/report.html", group: "Links" },
  { label: "My Take on PRH-JEPA, technical report", href: "/p/prh-jepa/report.html", group: "Links" },
  { label: "GitHub", href: CONTACT.github, group: "Links" },
  { label: "LinkedIn", href: CONTACT.linkedin, group: "Links" },
  { label: "Email · " + CONTACT.email, href: "mailto:" + CONTACT.email, group: "Links" },
  { label: "Toggle dev_mode · sandbox stubs", action: "toggle-sandbox", group: "System" },
];
