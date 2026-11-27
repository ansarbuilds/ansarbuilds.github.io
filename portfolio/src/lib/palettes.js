/* Precision Instrument & Monograph Palette.
   paper     alabaster stone (#f4f3ef), and light text on obsidian panels
   ink       deep slate-obsidian (#111318), and dark instrument panels
   accent    international signal cobalt (#1d4ed8)
   accentInk high-contrast cobalt on stone (>= 6.5:1 against paper)
   onDark    signal amber (#f59e0b) on obsidian (>= 9.5:1 against ink) */
export const PALETTES = {
  lumen:     { paper: "#f4f3ef", ink: "#111318", accent: "#1d4ed8", accentInk: "#1d4ed8", onDark: "#f59e0b" },
  bloom:     { paper: "#f4f3ef", ink: "#111318", accent: "#1d4ed8", accentInk: "#1d4ed8", onDark: "#f59e0b" },
  lumora:    { paper: "#f4f3ef", ink: "#111318", accent: "#1d4ed8", accentInk: "#1d4ed8", onDark: "#f59e0b" },
  neon:      { paper: "#f4f3ef", ink: "#111318", accent: "#1d4ed8", accentInk: "#1d4ed8", onDark: "#f59e0b" },
  choreo:    { paper: "#f4f3ef", ink: "#111318", accent: "#1d4ed8", accentInk: "#1d4ed8", onDark: "#f59e0b" },
  field:     { paper: "#f4f3ef", ink: "#111318", accent: "#1d4ed8", accentInk: "#1d4ed8", onDark: "#f59e0b" },
  blueBloom: { paper: "#f4f3ef", ink: "#111318", accent: "#1d4ed8", accentInk: "#1d4ed8", onDark: "#f59e0b" },
};

export const DEFAULT_PALETTE = "lumen";

export const PALETTE_LABELS = {
  lumen:     { title: "Atelier Stone", paper: "Alabaster", ink: "Obsidian", accent: "Cobalt" },
  bloom:     { title: "Blueprint", paper: "Alabaster", ink: "Obsidian", accent: "Cobalt" },
  lumora:    { title: "Monograph", paper: "Alabaster", ink: "Obsidian", accent: "Cobalt" },
  neon:      { title: "Lab Room", paper: "Alabaster", ink: "Obsidian", accent: "Cobalt" },
  choreo:    { title: "Case Study", paper: "Alabaster", ink: "Obsidian", accent: "Cobalt" },
  field:     { title: "Instrument", paper: "Alabaster", ink: "Obsidian", accent: "Cobalt" },
  blueBloom: { title: "Colophon", paper: "Alabaster", ink: "Obsidian", accent: "Cobalt" },
};

export const PALETTE_EVENT = "palettechange";
let current = DEFAULT_PALETTE;
export const currentPalette = () => current;

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

export function readableOn(bg, candidates) {
  const ok = candidates.find((c) => contrast(c, bg) >= 4.5);
  if (ok) return ok;
  return contrast("#000000", bg) >= contrast("#ffffff", bg) ? "#000000" : "#ffffff";
}

export function pickPalette(elements, lineY) {
  let name = DEFAULT_PALETTE;
  for (const el of elements) {
    if (el.getBoundingClientRect().top <= lineY && PALETTES[el.dataset.palette]) name = el.dataset.palette;
  }
  return name;
}

export function paletteForRoute(route, openSourceSlugs) {
  if (route === "work") return "bloom";
  if (!route.startsWith("project/")) return null;
  return openSourceSlugs.has(route.slice("project/".length)) ? "lumora" : "bloom";
}

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
