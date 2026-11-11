import { flushSync } from "react-dom";

/* Card to project page, and back, as one continuous move.

   This uses the browser's View Transitions API rather than Framer's shared
   layout. The router is hash-based and both views live in one scroller, so a
   shared-layout version would have to keep the outgoing page mounted and
   measure across a scroll reset. A view transition snapshots the old page,
   lets React swap the route in one synchronous step, and morphs the parts
   that share a name. Where the API is missing (or motion is reduced) the
   route simply changes and the incoming page fades in.

   Two parts travel: the card's image becomes the page's header panel
   ("vt-frame"), and the card's title becomes the page's h1 ("vt-title").
   The project page names its own parts in CSS; the card is named here, just
   in time, because only one element per page may carry each name. */

let active = false;
// True while a view transition is running. Pages read it on mount to skip
// their own entrance, which would fight the shared move.
export const isRouteTransitioning = () => active;

const slugOf = (route) => (route.startsWith("project/") ? route.slice("project/".length) : null);
const TAGGED = "data-vt-tagged";

function tag(card) {
  if (!card) return false;
  const box = card.getBoundingClientRect();
  // A card that is hidden (an inactive stage panel) or off screen has
  // nothing to travel from, so the page falls back to its plain fade.
  if (!box.width || getComputedStyle(card).visibility === "hidden" || box.bottom < 0 || box.top > window.innerHeight) return false;
  const frame = card.querySelector(".sc-card-media, .st-demo");
  const title = card.querySelector("h3");
  if (frame) { frame.style.viewTransitionName = "vt-frame"; frame.setAttribute(TAGGED, ""); }
  if (title) { title.style.viewTransitionName = "vt-title"; title.setAttribute(TAGGED, ""); }
  return true;
}
function untag() {
  document.querySelectorAll(`[${TAGGED}]`).forEach((el) => { el.style.viewTransitionName = ""; el.removeAttribute(TAGGED); });
}

/* Runs `apply` (the state change that swaps the route). Between the home
   page and a project page it wraps it in a view transition. `apply` must be
   synchronous: rendering is paused while a transition's callback runs, so
   nothing that waits for a frame can finish inside it. */
export function runRouteChange({ from, to, apply }) {
  const slug = slugOf(to) ?? slugOf(from);
  const opening = !!slugOf(to) && from === "main";
  const closing = !!slugOf(from) && to === "main";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!slug || !(opening || closing) || !document.startViewTransition || reduced) { apply(); return; }

  if (opening) tag(document.getElementById(`card-${slug}`));
  active = true;
  document.documentElement.classList.add("is-vt");
  const transition = document.startViewTransition(() => {
    // The old page has been captured, so its names can go before the new
    // page (which carries the same names) is rendered.
    untag();
    flushSync(apply);
    if (closing) {
      // Back on the home page: bring the card the visitor left from into
      // view, and let the page's header settle into it.
      const card = document.getElementById(`card-${slug}`);
      card?.scrollIntoView({ block: "center", behavior: "instant" });
      tag(card);
    }
  });
  transition.finished.finally(() => {
    untag();
    active = false;
    document.documentElement.classList.remove("is-vt");
  });
}
