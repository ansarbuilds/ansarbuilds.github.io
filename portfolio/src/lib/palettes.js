/* Each part of the home page has its own three-colour palette, and the
   whole page eases into it as that part reaches the middle of the screen.
   Sections opt in with data-palette="<name>"; anything above the first
   tagged element uses the opening palette, which is also what
   editorial.css declares on :root.

   paper     light surface, and text on dark sections
   ink       body text, and the dark sections' background
   accent    fills: bars, tabs, the contact button. Never small text.
   accentInk accent for text on paper (>= 4.5:1 against paper)
   onDark    accent for text on ink (>= 4.5:1 against ink) */
export const PALETTES = {
  // One dark theme end to end, with one accent: coral. Each part of the
  // home page tints the carbon and bone a few points, so the page shifts
  // mood as it scrolls without ever changing character. Only the
  // playground (neon) and project pages that ask (choreo) differ.
  // Opening: coral.
  lumen: { paper: "#0c0a09", ink: "#efe6d8", accent: "#ff8a5f", accentInk: "#ff8a5f", onDark: "#74200d" },
  // Selected work: a cooler carbon.
  bloom: { paper: "#0a0a0c", ink: "#ece8e0", accent: "#ff8a5f", accentInk: "#ff8a5f", onDark: "#74200d" },
  // More work: neutral carbon.
  lumora: { paper: "#0b0a0a", ink: "#eee7dc", accent: "#ff8a5f", accentInk: "#ff8a5f", onDark: "#74200d" },
  // The playground: neon rose.
  neon: { paper: "#0d090c", ink: "#f1e9ee", accent: "#ff2d95", accentInk: "#ff6fb5", onDark: "#a8004f" },
  // Lavender (project pages that ask for it).
  choreo: { paper: "#0c0a10", ink: "#ece8f3", accent: "#a98be0", accentInk: "#cdb8e8", onDark: "#4b2f6b" },
  // What I bring: a warmer carbon.
  field: { paper: "#0d0a08", ink: "#f0e7d9", accent: "#ff8a5f", accentInk: "#ff8a5f", onDark: "#74200d" },
  // Contact: the opening carbon, deepened.
  blueBloom: { paper: "#0b0909", ink: "#efe6d8", accent: "#ff8a5f", accentInk: "#ff8a5f", onDark: "#74200d" },
};

export const DEFAULT_PALETTE = "lumen";

// What the swatch card in the corner calls each palette and its colours,
// in the reels' style: a name, then each colour's name and hex.
export const PALETTE_LABELS = {
  lumen: { title: "Ember", paper: "Carbon", ink: "Bone", accent: "Coral" },
  bloom: { title: "Signal", paper: "Cool Carbon", ink: "Bone", accent: "Coral" },
  lumora: { title: "Lumora", paper: "Carbon", ink: "Bone", accent: "Coral" },
  neon: { title: "Human Next", paper: "Plum Black", ink: "Blush White", accent: "Neon Rose" },
  choreo: { title: "Choreo", paper: "Violet Black", ink: "Pale Lavender", accent: "Lavender" },
  field: { title: "Field / Form", paper: "Warm Carbon", ink: "Bone", accent: "Coral" },
  blueBloom: { title: "Blue Bloom", paper: "Deep Carbon", ink: "Bone", accent: "Coral" },
};

// applyPalette and clearPalette announce the palette now showing, so
// anything that displays it can follow without its own scroll handler.
export const PALETTE_EVENT = "palettechange";
let current = DEFAULT_PALETTE;
export const currentPalette = () => current;

// CSS custom property for each palette key. --ed-blue and --ed-ivory are the
// site's original names for ink and paper; --ed-deep has always matched ink.
export const PALETTE_VARS = {
  paper: ["--ed-ivory"],
  ink: ["--ed-blue", "--ed-deep"],
  accent: ["--ed-coral"],
  accentInk: ["--ed-coral-ink"],
  onDark: ["--ed-on-dark"],
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text colour for a chip of colour bg: the first candidate that reads at
// AA, else black or white, whichever reads better.
export function readableOn(bg, candidates) {
  const ok = candidates.find((c) => contrast(c, bg) >= 4.5);
  if (ok) return ok;
  return contrast("#000000", bg) >= contrast("#ffffff", bg) ? "#000000" : "#ffffff";
}

// A palette holds from the moment its element's top passes the line until
// the next tagged element's does. So a tagged block inside a section (Test
// the claim inside Projects) carries on to the end of that section instead
// of handing back to the section's palette for a second change.
export function pickPalette(elements, lineY) {
  let name = DEFAULT_PALETTE;
  for (const el of elements) {
    if (el.getBoundingClientRect().top <= lineY && PALETTES[el.dataset.palette]) name = el.dataset.palette;
  }
  return name;
}

// Project pages take the palette of the home page section they are listed
// in: the open-source studies and tools sit under Test the claim.
export function paletteForRoute(route, openSourceSlugs) {
  if (route === "work") return "bloom";
  if (!route.startsWith("project/")) return null;
  return openSourceSlugs.has(route.slice("project/".length)) ? "lumora" : "bloom";
}

// The browser's own chrome (theme-color) follows the paper colour too.
function setThemeColor(root, color) {
  root.ownerDocument?.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

export function applyPalette(root, name) {
  const palette = PALETTES[name] || PALETTES[DEFAULT_PALETTE];
  for (const [key, vars] of Object.entries(PALETTE_VARS)) {
    for (const v of vars) root.style.setProperty(v, palette[key]);
  }
  setThemeColor(root, palette.paper);
  current = PALETTES[name] ? name : DEFAULT_PALETTE;
  root.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: current }));
}

export function clearPalette(root) {
  for (const vars of Object.values(PALETTE_VARS)) {
    for (const v of vars) root.style.removeProperty(v);
  }
  setThemeColor(root, PALETTES[DEFAULT_PALETTE].paper);
  current = DEFAULT_PALETTE;
  root.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: current }));
}
