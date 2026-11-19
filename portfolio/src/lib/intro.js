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

export const COLD_OPEN_SESSION_KEY = "cold-open-played";

/* Whether the film's cold open should play over the home page, and which
   cut: "full" on a first visit (it then hands over to the hero's intro),
   "short" the first time in a later session, null otherwise. Never with
   reduced motion, on Save-Data or a 2G/3G connection, without WebGL 2, when the link points at a
   section further down, or when storage is unavailable. */
export function coldOpenMode() {
  if (typeof window === "undefined") return null;
  // On the dev server, /?coldopen=full (or short) always plays it, and
  // adding &at=5.2 holds it on that second, for working on a single frame.
  if (import.meta.env?.DEV) {
    const forced = new URLSearchParams(window.location.search).get("coldopen");
    if (forced === "full" || forced === "short") return forced;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  // On a slow connection the film would mostly be a wait for three.js.
  const connection = navigator.connection;
  if (window.location.hash || connection?.saveData || /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? "")) return null;
  let seenBefore;
  try {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY) || window.sessionStorage.getItem(COLD_OPEN_SESSION_KEY)) return null;
    seenBefore = !!window.localStorage.getItem(INTRO_SESSION_KEY);
  } catch {
    return null;
  }
  try {
    if (!document.createElement("canvas").getContext("webgl2")) return null;
  } catch {
    return null;
  }
  return seenBefore ? "short" : "full";
}
