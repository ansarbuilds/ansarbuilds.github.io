import "./actOne/actOne.css";
import { useEffect, useRef, useState } from "react";
import ActTitle from "./ActTitle";
import { ACT_ONE_SCREENS } from "./actOne/screens";
import { showBed } from "../lib/sound";

/* Act I (storyboard A1-01 to A1-03) as it sits on the home page: the sheet
   that slides up over the hero. It is as tall as the act's scrolling plus
   one screen, and pins a full-screen stage while the visitor scrolls
   through it; the scrollbar is the camera's playhead.

   The words stay real text: the statement is a title card over the frame,
   and the numbers and tools are also listed for screen readers. The scene
   (and three.js) loads as the section comes near. If it cannot start, the
   section's plain version (`fallback`) is shown instead. */
const SCREENS = ACT_ONE_SCREENS + 1;
// The sheet starts just below the first screen: load once it starts to slide
// up, which leaves a whole screen of scrolling for the scene to arrive.
const NEAR = "0px";

export default function ActOne({ receipts, tools, lead, rest, fallback }) {
  const section = useRef(null);
  const canvas = useRef(null);
  const card = useRef(null);
  const toolsCaption = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = section.current;
    let film = null, cancelled = false, onScreen = false;
    const progress = () => {
      const box = el.getBoundingClientRect();
      const span = box.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 0;
    };
    const onFrame = (t, show) => {
      if (card.current) {
        card.current.style.opacity = show.statement;
        card.current.style.transform = `translateY(${(1 - show.statement) * 18}px)`;
      }
      if (toolsCaption.current) toolsCaption.current.style.opacity = show.tools;
    };
    const run = () => film?.setActive(onScreen && document.visibilityState === "visible");

    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const [{ createActOne }] = await Promise.all([
          import("./actOne/createActOne"),
          document.fonts?.load("400 108px Anton"),
          document.fonts?.load("500 17px JetBrains Mono"),
        ]);
        if (cancelled) return;
        film = createActOne(canvas.current, { receipts, tools, getProgress: progress, onFrame });
        el.classList.add("is-live");
        run();
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

        // Once this act is on its way, fetch the next act's code too, so a fast
    // scroller never waits for a scene to arrive. (Fetched once; cached.)
    const warmNext = () => import("./actTwo/createActTwo").catch(() => {});
const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); warmNext(); } }, { rootMargin: NEAR });
    // The sound bed follows the act on screen (silent unless sound is on).
    const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; showBed("act1", onScreen); run(); });
    near.observe(el);
    seen.observe(el);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      near.disconnect();
      seen.disconnect();
      showBed("act1", false);
      document.removeEventListener("visibilitychange", run);
      film?.dispose();
    };
  }, [receipts, tools]);

  if (failed) return fallback;
  return <section ref={section} className="ed-intro sc-brief act1" aria-label="The short version" data-palette="lumen" style={{ "--act-screens": SCREENS }}>
    <div className="act1-stage">
      <ActTitle section={section}>I. The receipts</ActTitle>
      <canvas ref={canvas} className="act1-canvas" aria-hidden="true" />
      <div ref={card} className="act1-card"><p className="act1-statement">{lead} <em>{rest}</em></p></div>
      <p ref={toolsCaption} className="act1-tools" aria-hidden="true">Tools I build with <span>· point at one</span></p>
    </div>
    <dl className="sr-only">{receipts.map(({ value, label }) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}</dl>
    <p className="sr-only">Tools I build with: {tools.join(", ")}.</p>
  </section>;
}
