/* Records the film's score to public/score.wav. The music is the portfolio's
   own (portfolio/src/lib/sound.js and score.js: an organ in a long hall,
   strings, a clock figure, trailer drums), played live in a headless browser
   along the cut list: each chapter's section under it, a braam on each
   project's title, a drum on every cut, the finale chord at the end. The
   browser's output is tapped and recorded, then cut to the film's length.

   Needs the portfolio's Playwright: cd ../portfolio && npm ci. */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { extname, join, resolve } from "node:path";
import { TOTAL, FPS } from "../src/cuts.js";

const { chromium } = createRequire(resolve("../portfolio/package.json"))("@playwright/test");
const ROOT = resolve("..");
const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html" };
const PAGE = `<!doctype html><meta charset="utf-8"><script type="module">
import { setSound, showBed, cue } from "/portfolio/src/lib/sound.js";
import { CUTS, BEDS, FPS } from "/film/src/cuts.js";
window.ready = () => setSound(true);
window.play = () => new Promise((done) => {
  const t0 = performance.now();
  const at = (seconds, fn) => setTimeout(fn, Math.max(0, seconds * 1000 - (performance.now() - t0)));
  let bed = null;
  for (const cut of CUTS) {
    const s = cut.start / FPS;
    at(s, () => {
      const want = BEDS[cut.chapter];
      if (want !== bed) { if (bed) showBed(bed, false); showBed(want, true); bed = want; }
      if (cut.hit) cue(cut.hit);
      // A riser under a run of cuts, into the next big hit.
      if (cut.riser) cue("riser", cut.riser);
      // Keys ticking under a shot, evenly through it.
      for (let k = 1; k <= (cut.ticks ?? 0); k++) setTimeout(() => cue("tick"), (k * cut.frames / (cut.ticks + 1) / FPS) * 1000);
    });
    // The music rises into each project's title.
    if (cut.kind === "title" && s > 0.7) at(s - 0.7, () => cue("swell", 0.7));
  }
  at(CUTS.at(-1).end / FPS + 1.2, done);
});
</script>`;

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") { res.writeHead(200, { "content-type": "text/html" }); res.end(PAGE); return; }
  try { const body = await readFile(join(ROOT, path)); res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
// Tap what reaches the speakers.
await page.addInitScript(() => {
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const out = orig.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode && !window.__rec) {
      const tap = dest.context.createMediaStreamDestination();
      orig.call(this, tap);
      const chunks = [];
      const rec = new MediaRecorder(tap.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 256000 });
      rec.ondataavailable = (e) => chunks.push(e.data);
      window.__rec = rec;
      window.__stop = () => new Promise((ok) => { rec.onstop = () => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(new Blob(chunks)); }; rec.stop(); });
    }
    return out;
  };
});
await page.goto(`http://localhost:${port}/`);
await page.mouse.click(10, 10);
await page.evaluate(() => window.ready());
// Let the master fade up, then record from the first frame.
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__rec.start(); });
await page.evaluate(() => window.play());
const b64 = await page.evaluate(() => window.__stop());
await browser.close();
server.close();

await writeFile("out/score.webm", Buffer.from(b64, "base64"));
// To WAV, the film's length plus the tail of the last chord, faded at the end.
const seconds = TOTAL / FPS + 0.8;
// (Each hit sounds about 30 ms after its cue is called; that much is
// trimmed from the front so the hits land on the cuts.)
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", "0.03", "-i", "out/score.webm", "-t", String(seconds), "-af", `afade=t=out:st=${seconds - 0.6}:d=0.6`, "-ar", "48000", "public/score.wav"]);
console.log(`score.wav: ${seconds.toFixed(2)} s`);
