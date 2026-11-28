import { flushSync } from "react-dom";

/* Page changes as one continuous move, using the browser's View Transitions
   API: the old page is snapshotted, React swaps the route in one synchronous
   step, and the parts that share a name morph. A project's screenshot on
   the home page carries `view-transition-name: shot-<slug>` and so does the
   same screenshot at the top of its page, so the picture travels between
   them. Where the API is missing, or motion is reduced, the route changes
   and the new page fades in (.ab-route). */

let active = false;
export const isRouteTransitioning = () => active;

export function runRouteChange({ apply }) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduced) { apply(); return; }
  active = true;
  document.documentElement.classList.add("is-view-transition");
  const transition = document.startViewTransition(() => { flushSync(apply); });
  transition.finished.finally(() => {
    active = false;
    document.documentElement.classList.remove("is-view-transition");
  });
}
