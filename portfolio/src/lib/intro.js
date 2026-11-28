/* When the intro plays (components/Intro.jsx): once per visit (a new tab
   or window), on the home page, and only when it can be enjoyed.

   Never with reduced motion, on Save-Data or a 2G connection, or when the
   link points at a section further down. `?intro=1` forces it and
   `?intro=0` turns it off, for sharing a link or testing. */

export const INTRO_KEY = "intro-seen";

export function introWanted(location = window.location) {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(location.search).get("intro");
  if (param === "1") return true;
  if (param === "0") return false;
  if (location.pathname !== "/" || location.hash) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = navigator.connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return false;
  try {
    return !window.sessionStorage.getItem(INTRO_KEY);
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try { window.sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* not remembered */ }
}
