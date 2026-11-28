/* Everything that scrolls the page from code goes through here, so reduced
   motion is decided in one place. The document scrolls natively. */

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// A trip of many screens jumps: a long smooth scroll is slow.
const farAway = (distance) => Math.abs(distance) > window.innerHeight * 2.5;

export function scrollToTop({ instant = false } = {}) {
  const jump = instant || reducedMotion() || farAway(window.scrollY);
  window.scrollTo({ top: 0, behavior: jump ? "instant" : "smooth" });
}

export function scrollToElement(el, { center = false } = {}) {
  const jump = reducedMotion() || farAway(el.getBoundingClientRect().top);
  el.scrollIntoView({ behavior: jump ? "instant" : "smooth", block: center ? "center" : "start", inline: "nearest" });
}

// Kept for the older pages, which used to toggle smoothing; scrolling is
// native everywhere now.
export function setSmoothScroll() {}
