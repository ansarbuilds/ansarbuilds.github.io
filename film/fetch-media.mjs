// Gathers the footage the film cuts from into public/ (not committed):
// saywhen's and Haloscript's from the portfolio, Hedwig's launch reel from
// its own site on this domain.
import { copyFile, mkdir, writeFile, access } from "node:fs/promises";

const site = "../portfolio/public";
const local = [
  ["p/saywhen/demo.mp4", "saywhen-demo.mp4"],
  ["p/saywhen/loops/hero-loop.mp4", "saywhen-hero.mp4"],
  ["p/saywhen/loops/send-styles.mp4", "saywhen-send.mp4"],
  ["p/saywhen/loops/cancel.mp4", "saywhen-cancel.mp4"],
  ["p/saywhen/loops/five-states.mp4", "saywhen-states.mp4"],
  ["shots/haloscript/hero_home_mac.jpg", "halo-home-mac.jpg"],
  ["shots/haloscript/whiteboard_mac.jpg", "halo-whiteboard-mac.jpg"],
  ["shots/haloscript/corkboard_ipad.jpg", "halo-corkboard-ipad.jpg"],
  ["shots/haloscript/write_ipad.jpg", "halo-write-ipad.jpg"],
  ["shots/haloscript/write_iphone.jpg", "halo-write-iphone.jpg"],
  ["shots/haloscript/corkboard_iphone.jpg", "halo-corkboard-iphone.jpg"],
  ["shots/haloscript/storybible_mac.jpg", "halo-storybible-mac.jpg"],
  ["shots/haloscript/icon.png", "halo-icon.png"],
];
// The site's own faces.
const fonts = ["anton-latin-400-normal", "instrument-serif-latin-400-italic", "jetbrains-mono-latin-wght-normal", "outfit-latin-wght-normal"];
const remote = [["https://ansarbuilds.dev/hedwig/site/reel.mp4", "hedwig-reel.mp4"]];

await mkdir("public", { recursive: true });
for (const [from, to] of local) await copyFile(`${site}/${from}`, `public/${to}`);
for (const name of fonts) await copyFile(`../portfolio/src/assets/fonts/${name}.woff2`, `public/${name}.woff2`);
for (const [url, to] of remote) {
  try { await access(`public/${to}`); continue; } catch { /* fetch it */ }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  await writeFile(`public/${to}`, Buffer.from(await res.arrayBuffer()));
}
console.log(`media ready: ${local.length + remote.length} files`);
