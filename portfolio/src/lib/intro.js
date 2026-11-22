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

// Dev server only: ?coldopen=full forces the film's poster on every load.
export function coldOpenForced() {
  if (typeof window === "undefined" || !import.meta.env?.DEV) return false;
  return new URLSearchParams(window.location.search).get("coldopen") === "full";
}

/* Whether the home page opens on the film's poster (a Play button over
   black, see FilmPoster): on a first visit, where the film can play, and
   not when the link points at a section further down. Pressing Play starts
   the film with sound: a browser lets a page make sound only after a click.
   Everyone else gets the page, with "Watch the film" in the nav and hero. */
export function filmPosterWanted() {
  if (typeof window === "undefined") return false;
  if (coldOpenForced()) return true;
  if (window.location.hash || !filmEnabled()) return false;
  try {
    return !window.localStorage.getItem(INTRO_SESSION_KEY) && !window.sessionStorage.getItem(INTRO_SESSION_KEY) && !window.sessionStorage.getItem(COLD_OPEN_SESSION_KEY);
  } catch {
    return false;
  }
}

// Asks the app to play the film from the start (the nav and hero buttons).
export const WATCH_FILM = "film:watch";
export function watchFilm() {
  window.dispatchEvent(new Event(WATCH_FILM));
}
