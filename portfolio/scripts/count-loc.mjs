// The code figure under the receipts is a real count, not an estimate, so it
// has to be reproducible. This clones every repository on the account (public
// and private, forks excluded) and counts non-blank lines of hand-written
// source: no dependencies, build output, lockfiles, minified bundles or
// notebooks, whose size is mostly embedded image output rather than code.
//
//   node scripts/count-loc.mjs        # print the CODE block for content.js
//   node scripts/count-loc.mjs --keep # keep the clones for a second run
//
// Needs the GitHub CLI, signed in: the private repositories come from its token.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";

const LANGUAGES = {
  ".swift": "Swift", ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript",
  ".mjs": "JavaScript", ".cjs": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
  ".html": "HTML", ".css": "CSS", ".c": "C", ".h": "C", ".go": "Go", ".rs": "Rust",
  ".rb": "Ruby", ".java": "Java", ".kt": "Kotlin", ".sh": "Shell", ".sql": "SQL",
  ".yml": "YAML", ".yaml": "YAML",
};
// Anything here was installed, generated or vendored, not written.
const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "out", "vendor", "Pods", ".venv", "venv",
  "env", "__pycache__", ".next", "coverage", "DerivedData", "third_party", "third-party",
  "site-packages", ".cache", "target",
]);
const SKIP_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Podfile.lock"]);

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 << 20 });

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* sourceFiles(join(dir, entry.name));
    } else if (entry.isFile() && !SKIP_FILES.has(entry.name) && !entry.name.includes(".min.")) {
      yield join(dir, entry.name);
    }
  }
}

const keep = process.argv.includes("--keep");
const root = keep ? join(tmpdir(), "portfolio-loc") : mkdtempSync(join(tmpdir(), "loc-"));
const repos = gh("api", "user/repos", "--paginate", "-q", ".[]|select(.fork==false)|.full_name")
  .split("\n").filter(Boolean);

const lines = new Map();
let total = 0;
for (const repo of repos) {
  const name = repo.split("/")[1];
  const path = join(root, name);
  const cloned = (() => { try { return statSync(path).isDirectory(); } catch { return false; } })();
  if (!cloned) {
    process.stderr.write(`cloning ${repo}\n`);
    execFileSync("git", ["clone", "-q", "--depth", "1", `https://github.com/${repo}.git`, path]);
  }
  for (const file of sourceFiles(path)) {
    const language = LANGUAGES[extname(file).toLowerCase()];
    if (!language) continue;
    let text;
    try { text = readFileSync(file, "utf8"); } catch { continue; }
    if (text.includes("\u0000")) continue; // binary that happens to carry a source extension
    const n = text.split("\n").filter((line) => line.trim()).length;
    lines.set(language, (lines.get(language) || 0) + n);
    total += n;
  }
}
if (!keep) rmSync(root, { recursive: true, force: true });

const ranked = [...lines.entries()].sort((a, b) => b[1] - a[1]);
const asOf = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
const top = ranked.filter(([, n]) => n >= 1000).slice(0, 6);
console.log(`// ${repos.length} repositories, counted ${new Date().toISOString().slice(0, 10)}
export const CODE = {
  total: ${total},
  asOf: "${asOf}",
  languages: [
${top.map(([name, n]) => `    { name: "${name}", lines: ${n} },`).join("\n")}
  ],
};`);
console.error(`\n${total.toLocaleString()} lines across ${repos.length} repositories`);
console.error(ranked.map(([name, n]) => `  ${name.padEnd(12)} ${n.toLocaleString()}`).join("\n"));
