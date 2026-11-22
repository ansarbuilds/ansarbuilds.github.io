import "./coldOpen/coldOpen.css";
import { useEffect, useRef, useState } from "react";
import { createColdOpen } from "./coldOpen/createColdOpen";
import { SKIP_FILM } from "../lib/intro";

/* The cold open (storyboard shots CO-01 to CO-07): a point of light, two
   heartbeats, the pull back through the network, the network becoming the
   name, the line, and the frame opening onto the page.

   It is a full-screen layer over the real home page. Its name is built on
   top of the page's own name (see coldOpen/sampleName.js), so when the layer
   lifts the page is simply there, and the hero's own entrance carries on.

   It plays as the film starts (see App), and the acts follow it in the film
   player. A click does not skip it (a first click is what lets the sound
   start); the film's skip button does, by sending SKIP_FILM.
   The scene itself is in coldOpen/createColdOpen.js; this component is the
   page around it. */
// Dev server only: ?at=5.2 freezes the film on that second.
function heldSecond() {
  const at = parseFloat(new URLSearchParams(window.location.search).get("at"));
  return Number.isFinite(at) ? at : null;
}

export default function ColdOpen({ mode, since, onStart, onHandOver, onDone }) {
  const overlay = useRef(null);
  const canvas = useRef(null);
  const line = useRef(null);
  const [bars, setBars] = useState(true);
  const [handed, setHanded] = useState(false);

  useEffect(() => {
    let film;
    try {
      film = createColdOpen(canvas.current, {
        mode,
        waited: Math.max(0, (performance.now() - since) / 1000),
        holdAt: import.meta.env.DEV ? heldSecond() : null,
        onVeil: (opacity) => { if (overlay.current) overlay.current.style.opacity = opacity; },
        onBars: setBars,
        onLine: (text) => { if (line.current) line.current.textContent = text; },
        onName: (bounds) => {
          if (!line.current) return;
          line.current.style.left = `${(bounds.left + bounds.right) / 2}px`;
          line.current.style.top = `${bounds.bottom}px`;
        },
        onHandOver: () => { setHanded(true); onHandOver(); },
        onDone,
      });
    } catch (error) {
      // WebGL would not start. Show the page.
      if (import.meta.env.DEV) console.warn("cold open: could not start", error);
      onHandOver();
      onDone();
      return undefined;
    }
    onStart?.();
    const skip = () => film.skip();
    window.addEventListener(SKIP_FILM, skip);
    return () => { window.removeEventListener(SKIP_FILM, skip); film.dispose(); };
  }, [mode, since, onStart, onHandOver, onDone]);

  return <div ref={overlay} className={`co ${handed ? "is-leaving" : ""}`} data-mode={mode}>
    <canvas ref={canvas} className="co-canvas" aria-hidden="true" />
    <div className={`co-bars ${bars ? "is-closed" : ""}`} aria-hidden="true"><span /><span /></div>
    <p ref={line} className="co-line" aria-hidden="true" />
  </div>;
}
