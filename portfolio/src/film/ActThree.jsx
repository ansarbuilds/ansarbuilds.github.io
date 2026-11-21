import "./keyboard.css";
import "./actThree/actThree.css";
import { trackQuiet } from "./quiet";
import { useEffect, useRef, useState } from "react";
import ActTitle from "./ActTitle";
import { ArrowUpRight } from "lucide-react";
import { ACT_THREE_SCREENS } from "./actThree/screens";
import { cueOnRise, showBed } from "../lib/sound";

/* Act III ("What I bring") on the home page: three monoliths, one per
   capability, in a pinned stage the scrollbar drives. The title card, then
   one card per capability as its monolith faces the camera: real text and
   real links to the projects that prove it. If the scene cannot start, the
   plain section (`fallback`) is shown. */
const SCREENS = ACT_THREE_SCREENS + 1;

export default function ActThree({ capabilities, fallback }) {
  const section = useRef(null);
  const canvas = useRef(null);
  const title = useRef(null);
  const cards = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = section.current;
    const untrack = trackQuiet(el.querySelector(".act3-stage"));
    let film = null, cancelled = false, onScreen = false, loading = false;
    const progress = () => {
      const box = el.getBoundingClientRect();
      const span = box.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 0;
    };
    const show = (node, amount, rise) => {
      if (!node) return;
      node.style.opacity = amount;
      node.style.transform = `translateY(${(1 - amount) * rise}px)`;
      // Out of shot it is see-through and ignores the pointer, but it stays in
      // the tab order: a keyboard user can still reach it, and it shows itself
      // while it has focus (see .film-card in film/keyboard.css).
      node.style.visibility = "visible";
      node.classList.add("film-card");
      node.classList.toggle("is-offshot", amount <= 0.02);
    };
    // A low tone as the act lands on its held match cut.
    const cut = cueOnRise("tone", 0.9), chimes = capabilities.map(() => cueOnRise("chime"));
    const onFrame = (t, m) => {
      cut(m.held);
      show(title.current, m.title, 16);
      m.card.forEach((amount, i) => { show(cards.current[i], amount, 22); chimes[i](amount); });
    };
    const run = () => film?.setActive(onScreen && document.visibilityState === "visible");
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const [{ createActThree }] = await Promise.all([
          import("./actThree/createActThree"),
          document.fonts?.load("400 230px Anton"),
          document.fonts?.load("500 30px JetBrains Mono"),
        ]);
        if (cancelled) return;
        film = createActThree(canvas.current, { pillars: capabilities, getProgress: progress, onFrame });
        el.classList.add("is-live");
        run();
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
        // Once this act is on its way, fetch the next act's code too, so a fast
    // scroller never waits for a scene to arrive. (Fetched once; cached.)
    const warmNext = () => import("./actFour/createActFour").catch(() => {});
const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); warmNext(); } }, { rootMargin: "0px 0px 150% 0px" });
    // The sound bed follows the act on screen (silent unless sound is on).
    const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; showBed("act3", onScreen); run(); });
    near.observe(el);
    seen.observe(el);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      untrack();
      near.disconnect();
      seen.disconnect();
      showBed("act3", false);
      document.removeEventListener("visibilitychange", run);
      film?.dispose();
    };
  }, [capabilities]);

  if (failed) return fallback;
  return <section ref={section} id="capabilities" className="act3" aria-labelledby="act3-title" data-palette="field" style={{ "--act-screens": SCREENS }}>
    <div className="act3-stage" data-film-stage="act3">
      <ActTitle section={section}>III. What I bring</ActTitle>
      <canvas ref={canvas} className="act3-canvas" aria-hidden="true" />
      <div ref={title} className="act3-title">
        <p className="act3-kicker">03 · What I bring</p>
        <h2 id="act3-title">Three things, <em>done properly.</em></h2>
      </div>
      {capabilities.map((cap, i) => <article key={cap.id} ref={(node) => { cards.current[i] = node; }} className="act3-card" aria-label={cap.title}>
        <p className="act3-count"><strong>{cap.count}</strong> {cap.unit}</p>
        <h3>{cap.title}</h3>
        <p className="act3-copy">{cap.copy}</p>
        <ul>{cap.links.map((link) => <li key={link.href}><a href={link.href}>{link.name}<ArrowUpRight size={14} aria-hidden="true" /></a></li>)}</ul>
      </article>)}
    </div>
  </section>;
}
