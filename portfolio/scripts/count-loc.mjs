// The code figure under the receipts is a real count, not an estimate, so it
// has to be reproducible.
//
// It counts lines ADDED across history rather than lines standing in the
// current tip, because the figure claims work done, and a snapshot silently
// erases everything that was written and later rewritten, refactored or
// deleted. The consequence is that a line rewritten three times counts three
// times; that is the honest reading of "written", not of "exists today".
//
// Only commits authored by one of AUTHORS count, so the number is work by one
// person. Merge commits are skipped (their diffs repeat other commits), as are
// dependencies, build output, lockfiles, minified bundles, notebooks (whose
// size is mostly embedded image output) and data or config formats such as
// JSON, XML and plist, which are not code written by hand.
//
//   node scripts/count-loc.mjs        # print the CODE block for content.js
//   node scripts/count-loc.mjs --keep # keep the clones for a second run
//   node scripts/count-loc.mjs --from DIR # count clones already in DIR, one per repo
//
// It also lists TOOLS: the libraries and frameworks the repositories declare in
// their manifests (package.json, requirements.txt, pyproject.toml,
// Package.swift) at the current tip, ranked by how many repositories use them.
//
// Needs the GitHub CLI, signed in: the private repositories come from its token.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Every identity that has authored commits as Mohamed. Anything else — a
// collaborator, or a commit an AI coding tool authored rather than co-authored
// — is deliberately left out.
const AUTHORS = [
  "mohamedansarkms@icloud.com",
  "mohamedansar097@gmail.com",
  "119756764+kmsmohamedansar@users.noreply.github.com",
  "119756764+ansarbuilds@users.noreply.github.com",
  "119756764+ansarkms97@users.noreply.github.com",
  "119756764+TheAlchemist97@users.noreply.github.com",
];

const LANGUAGES = {
  swift: "Swift", py: "Python", js: "JavaScript", jsx: "JavaScript",
  mjs: "JavaScript", cjs: "JavaScript", ts: "TypeScript", tsx: "TypeScript",
  html: "HTML", css: "CSS", scss: "CSS", c: "C", h: "C", m: "Objective-C",
  mm: "Objective-C", cpp: "C++", hpp: "C++", go: "Go", rs: "Rust", rb: "Ruby",
  java: "Java", kt: "Kotlin", sh: "Shell", sql: "SQL", yml: "YAML", yaml: "YAML",
};
const SKIP_DIRS = [
  "node_modules", "dist", "build", "out", "vendor", "Pods", ".venv", "venv",
  "__pycache__", ".next", "coverage", "DerivedData", "third_party", "third-party",
  "site-packages", "target", ".xcodeproj",
];
const SKIP_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Podfile.lock"];

const skipped = (path) =>
  SKIP_DIRS.some((dir) => path.split("/").includes(dir) || path.includes(`${dir}/`)) ||
  SKIP_FILES.includes(path.split("/").pop()) ||
  path.includes(".min.");

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 256 << 20 });

const keep = process.argv.includes("--keep");
const fromIndex = process.argv.indexOf("--from");
const from = fromIndex > 0 ? process.argv[fromIndex + 1] : null;
const root = from || (keep ? join(tmpdir(), "portfolio-loc") : mkdtempSync(join(tmpdir(), "loc-")));
const repos = from
  ? readdirSync(from).filter((name) => statSync(join(from, name)).isDirectory()).map((name) => `local/${name}`)
  : run("gh", ["api", "user/repos", "--paginate", "-q", ".[]|select(.fork==false)|.full_name"])
      .split("\n").filter(Boolean);

const authors = new Set(AUTHORS.map((a) => a.toLowerCase()));
const lines = new Map();
const tools = new Map();
let total = 0;

// Libraries a repository declares, read from its manifests at the tip.
const TOOL_NAMES = {
  react: "React", "react-dom": null, vite: "Vite", tailwindcss: "Tailwind CSS",
  "framer-motion": "Framer Motion", next: "Next.js", express: "Express", typescript: "TypeScript",
  "@anthropic-ai/sdk": "Claude API", anthropic: "Claude API", openai: "OpenAI API",
  "@modelcontextprotocol/sdk": "MCP", mcp: "MCP", playwright: "Playwright",
  pandas: "pandas", numpy: "NumPy", "scikit-learn": "scikit-learn", sklearn: "scikit-learn",
  matplotlib: "Matplotlib", seaborn: "seaborn", plotly: "Plotly", streamlit: "Streamlit",
  fastapi: "FastAPI", flask: "Flask", django: "Django", requests: "Requests",
  beautifulsoup4: "Beautiful Soup", selenium: "Selenium", nltk: "NLTK", spacy: "spaCy",
  torch: "PyTorch", tensorflow: "TensorFlow", transformers: "Hugging Face Transformers",
  langchain: "LangChain", dagster: "Dagster", sqlalchemy: "SQLAlchemy", pydantic: "Pydantic",
  jupyter: "Jupyter", xgboost: "XGBoost", statsmodels: "statsmodels", scipy: "SciPy",
  "yfinance": "yfinance", "chromadb": "Chroma", "faiss-cpu": "FAISS", "uvicorn": null,
  "d3": "D3", "chart.js": "Chart.js", "three": "three.js", "electron": "Electron",
};
const manifestTools = (path) => {
  let files;
  try { files = run("git", ["ls-tree", "-r", "--name-only", "HEAD"], path).split("\n"); } catch { return []; }
  const found = new Set();
  const add = (dep) => {
    const key = dep.toLowerCase().trim();
    if (key in TOOL_NAMES) { if (TOOL_NAMES[key]) found.add(TOOL_NAMES[key]); }
  };
  for (const file of files.filter((f) => f && !skipped(f))) {
    const name = file.split("/").pop();
    if (!["package.json", "requirements.txt", "pyproject.toml", "Package.swift"].includes(name)) continue;
    let text;
    try { text = run("git", ["show", `HEAD:${file}`], path); } catch { continue; }
    if (name === "package.json") {
      try {
        const pkg = JSON.parse(text);
        Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).forEach(add);
      } catch { /* not valid JSON */ }
    } else if (name === "Package.swift") {
      for (const m of text.matchAll(/\.package\([^)]*?url:\s*"[^"]*\/([^/"]+?)(?:\.git)?"/g)) {
        found.add(m[1]);
      }
    } else {
      for (const line of text.split("\n")) {
        const dep = line.replace(/#.*/, "").match(/^\s*"?([A-Za-z0-9_.-]+)/);
        if (dep) add(dep[1]);
      }
    }
  }
  if (files.some((f) => f.includes(".xcodeproj/"))) found.add("Xcode");
  if (files.some((f) => f.endsWith(".ipynb"))) found.add("Jupyter");
  return [...found];
};
for (const repo of repos) {
  const path = join(root, repo.split("/")[1]);
  const cloned = (() => { try { return statSync(path).isDirectory(); } catch { return false; } })();
  if (!cloned && from) continue;
  if (!cloned) {
    process.stderr.write(`cloning ${repo}\n`);
    // Full history: --depth 1 would leave only the current tip to count.
    run("git", ["clone", "-q", `https://github.com/${repo}.git`, path]);
  } else if (run("git", ["rev-parse", "--is-shallow-repository"], path).trim() === "true") {
    // A clone kept from an earlier run may be shallow, which would silently
    // count one commit per repository instead of the whole history.
    process.stderr.write(`deepening ${repo}\n`);
    run("git", ["fetch", "-q", "--unshallow"], path);
  }
  // One record per commit: the author line, then a numstat line per file.
  const log = run("git", ["log", "--no-merges", "--numstat", "--format=%ae"], path);
  let mine = false;
  let wrote = false;
  for (const line of log.split("\n")) {
    if (!line) continue;
    const columns = line.split("\t");
    if (columns.length !== 3) {
      mine = authors.has(line.trim().toLowerCase());
      continue;
    }
    const [added, , file] = columns;
    if (!mine || added === "-" || skipped(file)) continue; // "-" marks a binary file
    const language = LANGUAGES[file.split(".").pop().toLowerCase()];
    if (!language || !file.includes(".")) continue;
    lines.set(language, (lines.get(language) || 0) + Number(added));
    total += Number(added);
    wrote = true;
  }
  if (wrote) for (const tool of manifestTools(path)) tools.set(tool, (tools.get(tool) || 0) + 1);
}
if (!keep && !from) rmSync(root, { recursive: true, force: true });

const ranked = [...lines.entries()].sort((a, b) => b[1] - a[1]);
const asOf = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
console.log(`// ${repos.length} repositories, counted ${new Date().toISOString().slice(0, 10)}
export const CODE = {
  total: ${total},
  repos: ${repos.length},
  asOf: "${asOf}",
  languages: [
${ranked.filter(([, n]) => n >= 1000).slice(0, 6).map(([name, n]) => `    { name: "${name}", lines: ${n} },`).join("\n")}
  ],
  tools: [${[...tools.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, n]) => `\n    { name: "${name}", repos: ${n} },`).join("")}
  ],
};`);
console.error(`\n${total.toLocaleString()} lines added across ${repos.length} repositories`);
console.error(ranked.map(([name, n]) => `  ${name.padEnd(12)} ${n.toLocaleString()}`).join("\n"));
