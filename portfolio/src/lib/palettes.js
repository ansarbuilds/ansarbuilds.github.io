/* Engineering-print paper palette across every section.
   paper     warm paper surface (#f8f6f4), and light text on black panels
   ink       pure black ink (#000000), and black panel backgrounds
   accent    coral fill (#e57981 / #d35f68) for buttons, bars, dots
   accentInk high-contrast coral ink on paper (>= 4.5:1 against paper)
   onDark    coral on black (>= 4.5:1 against ink) */
export const PALETTES = {
  lumen:     { paper: "#f8f6f4", ink: "#000000", accent: "#e57981", accentInk: "#a8323c", onDark: "#e57981" },
  bloom:     { paper: "#f8f6f4", ink: "#000000", accent: "#e57981", accentInk: "#a8323c", onDark: "#e57981" },
  lumora:    { paper: "#f8f6f4", ink: "#000000", accent: "#e57981", accentInk: "#a8323c", onDark: "#e57981" },
  neon:      { paper: "#f8f6f4", ink: "#000000", accent: "#e57981", accentInk: "#a8323c", onDark: "#e57981" },
  choreo:    { paper: "#f8f6f4", ink: "#000000", accent: "#e57981", accentInk: "#a8323c", onDark: "#e57981" },
  field:     { paper: "#f8f6f4", ink: "#000000", accent: "#e57981", accentInk: "#a8323c", onDark: "#e57981" },
  blueBloom: { paper: "#f8f6f4", ink: "#000000", accent: "#d35f68", accentInk: "#a8323c", onDark: "#e57981" },
};

export const DEFAULT_PALETTE = "lumen";

export const PALETTE_LABELS = {
  lumen:     { title: "Paper Print", paper: "Warm Paper", ink: "Black Ink", accent: "Coral" },
  bloom:     { title: "Spec Sheet", paper: "Warm Paper", ink: "Black Ink", accent: "Coral" },
  lumora:    { title: "Archive", paper: "Warm Paper", ink: "Black Ink", accent: "Coral" },
  neon:      { title: "Playground", paper: "Warm Paper", ink: "Black Ink", accent: "Coral" },
  choreo:    { title: "Case Study", paper: "Warm Paper", ink: "Black Ink", accent: "Coral" },
  field:     { title: "Capabilities", paper: "Warm Paper", ink: "Black Ink", accent: "Coral" },
  blueBloom: { title: "Colophon", paper: "Warm Paper", ink: "Black Ink", accent: "Coral Strong" },
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
