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

// Dev server only: ?coldopen=full plays the film on every load.
export function coldOpenForced() {
  if (typeof window === "undefined" || !import.meta.env?.DEV) return false;
  return new URLSearchParams(window.location.search).get("coldopen") === "full";
}

/* Whether the film plays on its own as the home page opens: on a first
   visit, where the film can play, and not when the link points at a
   section further down. Its sound starts at the visitor's first click, tap
   or key (a browser allows no sooner). Everyone else gets the page, with
   "Watch the film" in the nav and the hero. */
export function filmAutoplayWanted() {
  if (typeof window === "undefined") return false;
  if (coldOpenForced()) return true;
  if (window.location.hash || !filmEnabled()) return false;
  try {
    return !window.localStorage.getItem(INTRO_SESSION_KEY) && !window.sessionStorage.getItem(INTRO_SESSION_KEY) && !window.sessionStorage.getItem(COLD_OPEN_SESSION_KEY);
  } catch {
    return false;
  }
}

// Skips the rest of the film, wherever it is (the cold open listens).
export const SKIP_FILM = "film:skip";

// Asks the app to play the film from the start (the nav and hero buttons).
export const WATCH_FILM = "film:watch";
export function watchFilm() {
  window.dispatchEvent(new Event(WATCH_FILM));
}
