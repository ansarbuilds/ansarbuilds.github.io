import "./actTwo/actTwo.css";
import { trackQuiet } from "./quiet";
import { useEffect, useRef, useState } from "react";
import ActTitle from "./ActTitle";
import { ArrowUpRight } from "lucide-react";
import { ACT_TWO_SCREENS } from "./actTwo/screens";
import { media } from "../lib/media";
import { cueOnRise, showBed } from "../lib/sound";

/* Act II (the project sets) as it sits on the home page, just above the
   interactive work stage. Like Act I: a section as tall as the act's
   scrolling plus a screen, pinning a full-screen stage; the scrollbar is the
   camera's playhead.

   Each project gets its name as a title card over the arrival, then a card
   with its headline, numbers and links over the scene. Cards are real text
   and real links; a card that is not on screen is hidden from the keyboard
   too. `projects` lists the built sets in film order. */
const SCREENS = ACT_TWO_SCREENS + 1;

export default function ActTwo({ projects }) {
  const section = useRef(null);
  const canvas = useRef(null);
  const bars = useRef(null);
  const titles = useRef([]);
  const cards = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = section.current;
    const untrack = trackQuiet(el.querySelector(".act2-stage"));
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
    const cut = cueOnRise("tone", 0.9), chimes = projects.map(() => cueOnRise("chime"));
    const onFrame = (t, moments) => {
      let closed = false;
      cut(Math.max(...moments.map((x) => x.cut)));
      moments.forEach((m, i) => {
        chimes[i](m.card);
        show(titles.current[i], m.title, 10);
        show(cards.current[i], m.card, 22);
        closed ||= m.bars;
      });
      // Before the act starts its stage is still sliding up into view, and a
      // closed bar there reads as a black block across the page: the bars
      // only close once the act is playing.
      bars.current?.classList.toggle("is-closed", closed && t > 0);
    };
    const run = () => film?.setActive(onScreen && document.visibilityState === "visible");
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const [{ createActTwo }] = await Promise.all([import("./actTwo/createActTwo"), document.fonts?.load("500 40px JetBrains Mono")]);
        if (cancelled) return;
        film = createActTwo(canvas.current, { getProgress: progress, onFrame, media });
        el.classList.add("is-live");
        run();
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    // Load while the visitor is still in Act I, so the first set is ready.
        // Once this act is on its way, fetch the next act's code too, so a fast
    // scroller never waits for a scene to arrive. (Fetched once; cached.)
    const warmNext = () => import("./actThree/createActThree").catch(() => {});
const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); warmNext(); } }, { rootMargin: "0px 0px 150% 0px" });
    // The sound bed follows the act on screen (silent unless sound is on).
    const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; showBed("act2", onScreen); run(); });
    near.observe(el);
    seen.observe(el);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      untrack();
      near.disconnect();
      seen.disconnect();
      showBed("act2", false);
      document.removeEventListener("visibilitychange", run);
      film?.dispose();
    };
  }, [projects]);

  if (failed) return null;
  return <section ref={section} className="act2" aria-label="Selected work, the film" data-palette="bloom" style={{ "--act-screens": SCREENS }}>
    {/* Nine screens of film: a way past it for keyboards and screen readers. */}
    <a className="film-skip" href="#projects">Skip the film, go to the work</a>
    <div className="act2-stage" data-film-stage="act2">
      <ActTitle section={section} as="h2">II. Seven builds</ActTitle>
      <canvas ref={canvas} className="act2-canvas" aria-hidden="true" />
      <div ref={bars} className="act2-bars" aria-hidden="true"><span /><span /></div>
      {projects.map((project, i) => <p key={project.slug} ref={(node) => { titles.current[i] = node; }} className="act2-title" aria-hidden="true">{project.name}</p>)}
      {projects.map((project, i) => <article key={project.slug} ref={(node) => { cards.current[i] = node; }} className="act2-card" aria-label={project.name}>
        <p className="act2-eyebrow">{String(i + 1).padStart(2, "0")} · {project.eyebrow}</p>
        <h3>{project.name}</h3>
        <p className="act2-headline">{project.headline}</p>
        <dl className="act2-stats">{project.stats.map(([value, label]) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}</dl>
        {project.note && <p className="act2-note">{project.note}</p>}
        <div className="act2-links">
          <a className="act2-primary" href={`/work/${project.slug}/`}>Read the case study<ArrowUpRight size={16} aria-hidden="true" /></a>
          {project.links.map((link) => <a key={link.href} href={link.href} {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{link.label}{link.external && <ArrowUpRight size={14} aria-hidden="true" />}</a>)}
        </div>
      </article>)}
    </div>
  </section>;
}
