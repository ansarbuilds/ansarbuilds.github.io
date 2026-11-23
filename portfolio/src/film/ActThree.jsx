import "./actThree/actThree.css";
import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { cueOnRise } from "../lib/sound";
import { show, useAct } from "./useAct";

/* Act III ("What I bring") in the film player: three monoliths, one per
   capability. The title card, then one card per capability as its monolith
   faces the camera: real text and real links to the projects that prove it. */
export default function ActThree({ playback, capabilities }) {
  const canvas = useRef(null);
  const title = useRef(null);
  const cards = useRef([]);
  const cues = useRef(null);
  // A low tone on the held match cut, an impact as each monolith slams
  // home, and a drum as each carved face turns to the camera: three things.
  cues.current ??= { cut: cueOnRise("tone", 0.9), slam: cueOnRise("impact", 0.97), faces: capabilities.map(() => cueOnRise("drum", 0.6)) };

  const { failed } = useAct({
    id: "act3",
    playback,
    load: async () => {
      const [{ createActThree }] = await Promise.all([
        import("./actThree/createActThree"),
        document.fonts?.load("400 230px Anton"),
        document.fonts?.load("500 30px JetBrains Mono"),
      ]);
      return (options) => createActThree(canvas.current, { pillars: capabilities, ...options });
    },
    onFrame: (t, m) => {
      cues.current.cut(m.held);
      cues.current.slam(m.slam);
      m.glow.forEach((amount, i) => cues.current.faces[i]?.(amount));
      // The title slams in: large and out of focus, landing sharp.
      const node = title.current;
      if (node) {
        const u = 1 - m.title;
        node.style.opacity = Math.min(1, m.title * 1.6);
        node.style.transform = `scale(${1 + 0.3 * u * u})`;
        node.style.transformOrigin = "left bottom";
        node.style.filter = u > 0.01 ? `blur(${u * u * 14}px)` : "none";
        node.style.visibility = m.title > 0.02 ? "visible" : "hidden";
      }
      m.card.forEach((amount, i) => show(cards.current[i], amount, 22));
    },
  });

  if (failed) return null;
  return <section className="act3 film-act" data-act="act3" aria-labelledby="act3-title">
    <div className="act3-stage">
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
