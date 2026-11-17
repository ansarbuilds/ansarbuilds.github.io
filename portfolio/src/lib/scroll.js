import Lenis from "lenis";
import "lenis/dist/lenis.css";

/* The page scrolls the document (not a box inside it), smoothed by Lenis.

   Everything that scrolls the page from code goes through here, so smooth
   scrolling, reduced motion and the full-screen views (which must not be
   smoothed: they own the wheel for orbit controls and inner lists) are
   decided in one place. Touch scrolling stays native. */

let lenis = null;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Start or stop smoothing. Full-screen views pass false.
export function setSmoothScroll(on) {
  if (typeof window === "undefined") return;
  if (!on || reducedMotion()) {
    lenis?.destroy();
    lenis = null;
    return;
  }
  if (lenis) return;
  // Nested lists (the terminal, the command palette, code blocks) keep
  // scrolling on their own.
  lenis = new Lenis({ autoRaf: true, allowNestedScroll: true, stopInertiaOnNavigate: true });
}

// Jump straight there when the trip is long: a smooth scroll over many
// screens is slow and makes every section on the way animate in.
const farAway = (distance) => Math.abs(distance) > window.innerHeight * 1.25;

export function scrollToTop({ instant = false } = {}) {
  const jump = instant || reducedMotion() || farAway(window.scrollY);
  if (lenis) lenis.scrollTo(0, { immediate: jump, force: true });
  else window.scrollTo({ top: 0, behavior: jump ? "auto" : "smooth" });
}

export function scrollToElement(el, { center = false } = {}) {
  const box = el.getBoundingClientRect();
  const jump = reducedMotion() || farAway(box.top);
  if (lenis && !center) lenis.scrollTo(el, { immediate: jump, force: true });
  else el.scrollIntoView({ behavior: jump ? "auto" : "smooth", block: center ? "center" : "start", inline: "nearest" });
}
