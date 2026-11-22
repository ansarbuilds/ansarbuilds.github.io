import "./actTwo/actTwo.css";
import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { media } from "../lib/media";
import { cueOnRise } from "../lib/sound";
import { show, useAct } from "./useAct";

/* Act II (the project sets) in the film player. Each project gets its name
   as a title card over the arrival, then a card with its headline, numbers
   and links over the scene. Cards are real text and real links; a card that
   is not on screen is hidden from the keyboard too. `projects` lists the
   built sets in film order. */
export default function ActTwo({ playback, projects }) {
  const canvas = useRef(null);
  const bars = useRef(null);
  const titles = useRef([]);
  const cards = useRef([]);
  const cues = useRef(null);
  cues.current ??= { cut: cueOnRise("tone", 0.9), chimes: projects.map(() => cueOnRise("chime")) };

  const { failed } = useAct({
    id: "act2",
    playback,
    load: async () => {
      const [{ createActTwo }] = await Promise.all([import("./actTwo/createActTwo"), document.fonts?.load("500 40px JetBrains Mono")]);
      return (options) => createActTwo(canvas.current, { media, ...options });
    },
    onFrame: (t, moments) => {
      let closed = false;
      cues.current.cut(Math.max(...moments.map((x) => x.cut)));
      moments.forEach((m, i) => {
        cues.current.chimes[i]?.(m.card);
        // The title resolves like a film title: out of focus and a touch
        // large, settling sharp as it lands.
        const title = titles.current[i];
        if (title) {
          title.style.opacity = m.title;
          title.style.transform = `scale(${1.06 - 0.06 * m.title})`;
          title.style.filter = m.title < 0.99 ? `blur(${(1 - m.title) * 10}px)` : "none";
          title.style.visibility = m.title > 0.02 ? "visible" : "hidden";
        }
        show(cards.current[i], m.card, 22);
        closed ||= m.bars;
      });
      bars.current?.classList.toggle("is-closed", closed && t > 0);
    },
  });

  if (failed) return null;
  return <section className="act2 film-act" data-act="act2" aria-label="Selected work">
    <div className="act2-stage">
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
