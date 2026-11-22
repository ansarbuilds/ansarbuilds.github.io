export const INTRO_SESSION_KEY = "intro-played";

/* Whether the hero should play its intro (the name setting large, then
   travelling to its place; see Hero in Sections.jsx): once per browser, so a
   return visit opens straight on the hero. Never with reduced motion, and
   never if storage is unavailable (private mode), since an intro that
   replays on every page is worse than none. The session key is still
   honoured so a test, or an older visit, can switch it off. */
export function shouldPlayIntro() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return !window.localStorage.getItem(INTRO_SESSION_KEY) && !window.sessionStorage.getItem(INTRO_SESSION_KEY);
  } catch {
    return false;
  }
}

/* Whether this visitor gets the film's 3D scenes at all: not with reduced
   motion, on Save-Data or a 2G/3G connection, or without WebGL 2. The page
   shows its plain version instead. */
export function filmEnabled() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = navigator.connection;
  if (connection?.saveData || /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? "")) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export const COLD_OPEN_SESSION_KEY = "cold-open-played";

/* Whether the film's cold open should play over the home page, and which
   cut: "full" on a first visit (it then hands over to the hero's intro),
   "short" the first time in a later session or on a phone held upright,
   null otherwise. Never with
   reduced motion, on Save-Data or a 2G/3G connection, without WebGL 2, when the link points at a
   section further down, or when storage is unavailable. */
// Dev server only: ?coldopen=full or ?coldopen=short forces the cold open.
export function coldOpenForced() {
  if (typeof window === "undefined" || !import.meta.env?.DEV) return false;
  return ["full", "short"].includes(new URLSearchParams(window.location.search).get("coldopen"));
}

export function coldOpenMode() {
  if (typeof window === "undefined") return null;
  // On the dev server, /?coldopen=full (or short) always plays it, and
  // adding &at=5.2 holds it on that second, for working on a single frame.
  if (import.meta.env?.DEV) {
    const forced = new URLSearchParams(window.location.search).get("coldopen");
    if (forced === "full" || forced === "short") return forced;
  }
  if (window.location.hash || !filmEnabled()) return null;
  let seenBefore;
  try {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY) || window.sessionStorage.getItem(COLD_OPEN_SESSION_KEY)) return null;
    seenBefore = !!window.localStorage.getItem(INTRO_SESSION_KEY);
  } catch {
    return null;
  }
  // On a phone held upright the full cut is a long wait in a thin strip of
  // screen, so a phone gets the short cut, which joins at the name.
  const phone = window.matchMedia?.("(max-width: 700px) and (orientation: portrait)").matches;
  return seenBefore || phone ? "short" : "full";
}
