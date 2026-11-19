import "./actFour/actFour.css";
import { useEffect, useRef, useState } from "react";
import ActTitle from "./ActTitle";
import { ArrowUpRight } from "lucide-react";
import { ACT_FOUR_SCREENS } from "./actFour/screens";
import { cueOnRise, showBed } from "../lib/sound";

/* Act IV, the playground reel, on the home page between More work and
   Contact: the network collapses into a star, then the solar system, the
   infinity ribbon and Emet's terminal, each with a card that opens the real
   experiment. `experiments` are in film order. */
const SCREENS = ACT_FOUR_SCREENS + 1;

export default function ActFour({ experiments }) {
  const section = useRef(null);
  const canvas = useRef(null);
  const title = useRef(null);
  const cards = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = section.current;
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
      node.style.visibility = amount > 0.02 ? "visible" : "hidden";
    };
    const chimes = experiments.map(() => cueOnRise("chime"));
    const onFrame = (t, m) => {
      show(title.current, m.title, 16);
      m.cards.forEach((amount, i) => { show(cards.current[i], amount, 22); chimes[i](amount); });
    };
    const run = () => film?.setActive(onScreen && document.visibilityState === "visible");
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const [{ createActFour }] = await Promise.all([import("./actFour/createActFour"), document.fonts?.load("500 34px JetBrains Mono")]);
        if (cancelled) return;
        film = createActFour(canvas.current, { getProgress: progress, onFrame });
        el.classList.add("is-live");
        run();
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
        // Once this act is on its way, fetch the next act's code too, so a fast
    // scroller never waits for a scene to arrive. (Fetched once; cached.)
    const warmNext = () => import("./finale/createFinale").catch(() => {});
const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); warmNext(); } }, { rootMargin: "0px 0px 150% 0px" });
    // The sound bed follows the act on screen (silent unless sound is on).
    const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; showBed("act4", onScreen); run(); });
    near.observe(el);
    seen.observe(el);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      near.disconnect();
      seen.disconnect();
      showBed("act4", false);
      document.removeEventListener("visibilitychange", run);
      film?.dispose();
    };
  }, [experiments]);

  if (failed) return null;
  return <section ref={section} id="ai" className="act4" aria-labelledby="act4-title" data-palette="neon" style={{ "--act-screens": SCREENS }}>
    <div className="act4-stage">
      <ActTitle section={section}>IV. The playground</ActTitle>
      <canvas ref={canvas} className="act4-canvas" aria-hidden="true" />
      <div ref={title} className="act4-title">
        <p className="act4-kicker">05 · The playground</p>
        <h2 id="act4-title">What if <em>I tried this?</em></h2>
      </div>
      {experiments.map((experiment, i) => <article key={experiment.id} ref={(node) => { cards.current[i] = node; }} className="act4-card" aria-label={experiment.title}>
        <p className="act4-kicker">{String(i + 1).padStart(2, "0")} · Interactive</p>
        <h3>{experiment.title}</h3>
        <p className="act4-copy">{experiment.hook}</p>
        <a className="act4-cta" href={experiment.href}>{experiment.cta}<ArrowUpRight size={16} aria-hidden="true" /></a>
      </article>)}
    </div>
  </section>;
}
