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

// While the film plays over the page, the page does not scroll under it.
export function holdScroll(held) {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle("is-scroll-held", held);
  if (held) lenis?.stop(); else lenis?.start();
}

// Jump straight there when the trip is long: a smooth scroll over many
// screens is slow and makes every section on the way animate in.
const farAway = (distance) => Math.abs(distance) > window.innerHeight * 1.25;

/* The browser can move the page without Lenis knowing: following a #hash
   itself, restoring a position. Lenis then measures from where it last left
   the page, and a scroll it starts lands in the wrong place (back near the
   top). Tell it where the page really is first. */
function syncLenis() {
  if (lenis && Math.abs(lenis.animatedScroll - window.scrollY) > 1) lenis.scrollTo(window.scrollY, { immediate: true, force: true });
}

export function scrollToTop({ instant = false } = {}) {
  syncLenis();
  const jump = instant || reducedMotion() || farAway(window.scrollY);
  if (lenis) lenis.scrollTo(0, { immediate: jump, force: true });
  else window.scrollTo({ top: 0, behavior: jump ? "auto" : "smooth" });
}

export function scrollToElement(el, { center = false } = {}) {
  syncLenis();
  const box = el.getBoundingClientRect();
  const jump = reducedMotion() || farAway(box.top);
  const move = () => {
    // An absolute position, measured now: right even if the page moved.
    if (lenis && !center) lenis.scrollTo(el.getBoundingClientRect().top + window.scrollY, { immediate: jump, force: true });
    else el.scrollIntoView({ behavior: jump ? "auto" : "smooth", block: center ? "center" : "start", inline: "nearest" });
  };
  move();
  if (jump && !center) holdOn(el, move);
}

/* After a long jump the page above the target is seen for the first time:
   images load and sections lay themselves out, and the target slides away
   from where the jump landed. For a moment afterwards, jump again whenever
   it has drifted. The visitor's own scrolling ends that at once. */
function holdOn(el, move) {
  let frame = 0;
  // Long enough for the images above it to arrive on a slow connection.
  const until = performance.now() + 3000;
  const events = ["wheel", "touchstart", "keydown", "pointerdown"];
  const stop = () => {
    cancelAnimationFrame(frame);
    events.forEach((name) => window.removeEventListener(name, stop));
  };
  const check = () => {
    if (performance.now() > until || !el.isConnected) { stop(); return; }
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (Math.abs(el.getBoundingClientRect().top) > 4 && !atBottom) move();
    frame = requestAnimationFrame(check);
  };
  events.forEach((name) => window.addEventListener(name, stop, { passive: true, once: true }));
  frame = requestAnimationFrame(check);
}
