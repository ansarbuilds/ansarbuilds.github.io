import "./actFour/actFour.css";
import { useRef } from "react";
import ActTitle from "./ActTitle";
import { ArrowUpRight } from "lucide-react";
import { cueOnRise } from "../lib/sound";
import { show, useAct } from "./useAct";

/* Act IV, the playground reel, in the film player: the network collapses
   into a star, then the solar system, the infinity ribbon and Emet's
   terminal, each with a card that opens the real experiment. `experiments`
   are in film order. */
export default function ActFour({ playback, experiments }) {
  const canvas = useRef(null);
  const title = useRef(null);
  const cards = useRef([]);
  const chimes = useRef(null);
  chimes.current ??= experiments.map(() => cueOnRise("chime"));

  const { failed, titleUp } = useAct({
    id: "act4",
    playback,
    load: async () => {
      const [{ createActFour }] = await Promise.all([import("./actFour/createActFour"), document.fonts?.load("500 34px JetBrains Mono")]);
      return (options) => createActFour(canvas.current, options);
    },
    onFrame: (t, m) => {
      show(title.current, m.title, 16);
      m.cards.forEach((amount, i) => { show(cards.current[i], amount, 22); chimes.current[i]?.(amount); });
    },
  });

  if (failed) return null;
  return <section className="act4 film-act" data-act="act4" aria-labelledby="act4-title">
    <div className="act4-stage">
      <ActTitle up={titleUp}>IV. The playground</ActTitle>
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
