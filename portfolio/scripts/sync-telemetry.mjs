// Copies the code numbers from my GitHub profile README into the site, so
// the two always say the same thing.
//
// The profile repository (ansarbuilds/ansarbuilds) recounts them on every
// push: lines added across the history of every repository I own, public
// and private, skipping bots, merge commits and commits over 250,000 lines
// (data dumps). See its .github/scripts/update_loc.py. This script reads the
// totals from the card it draws and writes src/data/telemetry.json.
//
// Runs before every build. If GitHub cannot be reached, the last saved
// numbers stay, so a build never fails because of it.
import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://raw.githubusercontent.com/ansarbuilds/ansarbuilds/main/assets/";
const OUT = new URL("../src/data/telemetry.json", import.meta.url);

const number = (text) => Number(text.replace(/[^0-9]/g, ""));
const fetchText = async (name) => {
  const response = await fetch(BASE + name, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.text();
};

// The card's own words, e.g. aria-label="Codebase telemetry: 896,133 lines of
// code written across 54 GitHub repositories." and "1,512 … COMMITS PUSHED".
export function parseCode(svg) {
  const label = svg.match(/aria-label="[^"]*?([\d,]+) lines of code[^"]*?across (\d+)/i);
  const texts = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].trim());
  const commitsAt = texts.findIndex((t) => /COMMITS PUSHED/i.test(t));
  if (!label || commitsAt < 1) throw new Error("code card: totals not found");
  return { lines: number(label[1]), repos: number(label[2]), commits: number(texts[commitsAt - 1]) };
}

export function parseHours(svg) {
  const label = svg.match(/aria-label="[^"]*?about ([\d,]+)\+? hours/i);
  if (!label) throw new Error("hours card: total not found");
  return { hours: number(label[1]) };
}

async function main() {
  const previous = JSON.parse(await readFile(OUT, "utf8").catch(() => "{}"));
  try {
    const [code, hours] = await Promise.all([fetchText("code-telemetry.svg"), fetchText("build-hours.svg")]);
    const next = { ...parseCode(code), ...parseHours(hours), source: "https://github.com/ansarbuilds", syncedAt: new Date().toISOString().slice(0, 10) };
    await writeFile(OUT, JSON.stringify(next, null, 2) + "\n");
    console.log(`telemetry: ${next.lines.toLocaleString("en-US")} lines, ${next.repos} repositories, ${next.commits.toLocaleString("en-US")} commits, ${next.hours}+ hours`);
  } catch (error) {
    if (!previous.lines) throw error;
    console.warn(`telemetry: kept the saved numbers from ${previous.syncedAt} (${error.message})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
