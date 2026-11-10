// Small pointer effects shared by the home page. Each one writes straight to
// the element's style, so nothing re-renders while the pointer moves.

const fine = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Sets --mx/--my on the element under the pointer, for CSS spotlights.
export function trackPointer(event) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
}

// Magnetic buttons: the element leans toward the pointer, then springs back.
export function magnet(event) {
  if (!fine() || calm()) return;
  const el = event.currentTarget;
  const box = el.getBoundingClientRect();
  const dx = event.clientX - (box.left + box.width / 2);
  const dy = event.clientY - (box.top + box.height / 2);
  el.style.translate = `${(dx * 0.28).toFixed(1)}px ${(dy * 0.38).toFixed(1)}px`;
}
export function release(event) {
  event.currentTarget.style.translate = "";
}
export const magnetic = { onPointerMove: magnet, onPointerLeave: release, "data-magnetic": "" };
