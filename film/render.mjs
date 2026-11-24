/* Renders the film, wide and upright, to the portfolio's public/film/.
   Run fetch-media.mjs first, and score/record.mjs to remake the score.
   REMOTION_BROWSER can point at a Chrome Headless Shell to use (Playwright's
   works) when Remotion cannot download its own. */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { CHAPTERS, FPS, TOTAL } from "./src/cuts.js";

const out = "../portfolio/public/film";
mkdirSync(out, { recursive: true });
// The player's timeline: the film's length and its chapters.
writeFileSync("../portfolio/src/film/filmCuts.json", JSON.stringify({ seconds: +(TOTAL / FPS).toFixed(3), chapters: CHAPTERS.map(({ id, seconds, numeral, name }) => ({ id, seconds: +seconds.toFixed(3), numeral, name })) }, null, 2) + "\n");

const browser = process.env.REMOTION_BROWSER ? ["--browser-executable", process.env.REMOTION_BROWSER] : [];
for (const [id, file] of [["Film", "film-wide.mp4"], ["FilmUpright", "film-upright.mp4"]]) {
  execFileSync("npx", ["remotion", "render", "src/index.js", id, `${out}/${file}`, "--codec", "h264", "--crf", "27", "--audio-bitrate", "128k", "--x264-preset", "slow", "--log", "error", ...browser], { stdio: "inherit" });
  execFileSync("npx", ["remotion", "still", "src/index.js", id, `${out}/${file.replace(".mp4", "-poster.jpg")}`, "--frame", "0", "--jpeg-quality", "80", "--log", "error", ...browser], { stdio: "inherit" });
  console.log(`${file}: ${(statSync(`${out}/${file}`).size / 1e6).toFixed(2)} MB`);
}
