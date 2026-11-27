import { PROJECT_INDEX } from "./projectIndex.js";

// The full index: every project on the site, hidden ones included, grouped
// by what kind of work it is. The home page shows the groups as a compact
// list; /work/ shows every row. A project missing from GROUPS lands in the
// last group, so nothing silently drops out (projectIndex.test.mjs checks).
const GROUPS = [
  { id: "models", label: "Language models & AI studies", slugs: ["hedwig", "decision-models", "rea-study", "prh-jepa"] },
  { id: "agents", label: "Agents & agent tooling", slugs: ["jarvis", "agent-flight-recorder", "storyera", "site-recon", "authorized-web-exposure-audit", "mcp-workflow", "local-agent"] },
  { id: "apps", label: "Apps", slugs: ["saywhen", "haloscript", "reptrack", "sql-playground", "lineage-explorer", "taskmaster", "customer-predictor", "grocery-assistant"] },
  { id: "data", label: "AI for data & operations", slugs: ["analytics-assistant", "catalogue-checker", "category-copilot", "smart-categorization", "fine-food-sentiment", "data-delivery", "integration", "health-dashboard"] },
  { id: "browser", label: "Browser extensions", slugs: ["sitescout", "sidecar", "scope-checker"] },
  { id: "scripts", label: "Scripts & early experiments", slugs: ["news-scraper", "spotify-trends", "cpl-dream-xi", "forex-tools", "f1-telemetry"] },
];

const bySlug = new Map(PROJECT_INDEX.map((p) => [p.slug, p]));
const placed = new Set(GROUPS.flatMap((g) => g.slugs));
const strays = PROJECT_INDEX.filter((p) => !placed.has(p.slug)).map((p) => p.slug);

// The first sentence of a hook, for one-line rows.
export const oneLine = (text = "") => (text.match(/^.+?[.!?](\s|$)/) || [text])[0].trim();

export const ARCHIVE = GROUPS.map((group, i) => ({
  ...group,
  projects: [...group.slugs, ...(i === GROUPS.length - 1 ? strays : [])].map((slug) => bySlug.get(slug)).filter(Boolean),
}));
export const ARCHIVE_TOTAL = ARCHIVE.reduce((n, g) => n + g.projects.length, 0);
