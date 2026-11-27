// Site-wide copy: the hero, skills, contact
// details and command palette. Projects live in projects.js.
//
// House style: plain words, short sentences, first person, no em dashes.

export const HERO = {
  eyebrow: "Canada",
  title: "I build agents, test AI claims and ship apps.",
  // The home page headline: the strongest single fact, two lines. The name
  // sits above it as the h1; the line under it covers the rest of the work.
  claim: ["I trained an LLM from scratch:", "286.7M parameters for $2.45."],
  lede: [
    { text: "I build agents that run on their own, tools that make coding agents debuggable, independent evaluations of AI claims, and native apps people download from the App Store. Everything ships with its code, its numbers and a full write-up, including what failed." },
  ],
};

// Quick proof, right under the intro, before anyone reads a paragraph.
// Every value is counted, not estimated: PROJECTS is the full index, LINES
// comes from CODE below.
export const RECEIPTS = [
  { value: "PROJECTS", label: "projects in the index, from that model to my first scripts", accent: "green" },
  { value: "LINES", label: "lines of code I wrote, across REPOS repositories", accent: "cyan" },
  { value: "3", label: "independent AI studies, each with a technical report", accent: "rose" },
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

export const CONTACT = {
  email: "mohamedansarkms@gmail.com",
  linkedin: "https://www.linkedin.com/in/kmsmohamedansar/",
  github: "https://github.com/ansarbuilds",
  // Drop a PDF in public/ and point this at it ("/mohamed-ansar-cv.pdf") to
  // show a CV link in Contact and the nav. Left empty, no link renders.
  resume: "",
};

// The command palette's fixed entries. Its project list is built from the
// listed projects themselves (see CommandPalette.jsx), so it never drifts.
export const COMMAND_ITEMS = [
  { label: "Selected work · six flagship builds", go: "#projects", group: "Sections" },
  { label: "What I bring · agents, evals, shipping", go: "#capabilities", group: "Sections" },
  { label: "More shipped work", go: "#more", group: "Sections" },
  { label: "Contact", go: "#contact", group: "Sections" },
  { label: "All projects, in one list", go: "/work/", group: "Sections" },
  { label: "RepTrack on the App Store", href: "https://apps.apple.com/us/app/reptrack-workout-log/id6761032027", group: "Links" },
  { label: "My Take on Jev, technical report", href: "/p/decision-models/report.html", group: "Links" },
  { label: "My Take on REA, technical report", href: "/p/rea-study/report.html", group: "Links" },
  { label: "My Take on PRH-JEPA, technical report", href: "/p/prh-jepa/report.html", group: "Links" },
  { label: "GitHub", href: CONTACT.github, group: "Links" },
  { label: "LinkedIn", href: CONTACT.linkedin, group: "Links" },
  { label: "Email · " + CONTACT.email, href: "mailto:" + CONTACT.email, group: "Links" },
];
