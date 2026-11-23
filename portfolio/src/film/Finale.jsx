import "./finale/finale.css";
import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { cueOnRise } from "../lib/sound";
import { useAct } from "./useAct";

/* The finale in the film player: one point of light, then the line, one
   button, the address and two quiet links. Bookend to the cold open. */
export default function Finale({ playback, contact, credit }) {
  const canvas = useRef(null);
  const block = useRef(null);
  const title = useRef(null);
  const cues = useRef(null);
  // A rise into the landing, then the final hit.
  cues.current ??= { swell: cueOnRise("swell", 0.35), land: cueOnRise("finale", 0.01) };

  const { failed } = useAct({
    id: "finale",
    playback,
    load: async () => {
      const { createFinale } = await import("./finale/createFinale");
      return (options) => createFinale(canvas.current, options);
    },
    onFrame: (t, m) => {
      cues.current.swell(m.gather);
      cues.current.land(m.burst);
      // The frame keeps pushing in on the last shot.
      if (canvas.current) canvas.current.style.transform = `scale(${1 + 0.07 * m.contact})`;
      if (!block.current) return;
      block.current.style.opacity = Math.min(1, m.contact * 2.5);
      block.current.style.visibility = m.contact > 0.02 ? "visible" : "hidden";
      // The line slams in: large and out of focus, landing sharp.
      if (title.current) {
        const u = 1 - m.contact;
        title.current.style.transform = `scale(${1 + 0.32 * u * u})`;
        title.current.style.filter = u > 0.01 ? `blur(${u * u * 14}px)` : "none";
        title.current.style.textShadow = `0 0 ${20 + 60 * m.burst}px rgb(255 160 110 / ${0.25 + 0.5 * m.burst})`;
      }
    },
  });

  if (failed) return null;
  return <section className="fin film-act" data-act="finale" aria-labelledby="fin-title">
    <div className="fin-stage">
      <canvas ref={canvas} className="fin-canvas" aria-hidden="true" />
      <div ref={block} className="fin-block">
        <h2 ref={title} id="fin-title">Let's build <em>something.</em></h2>
        <a className="fin-email" href={`mailto:${contact.email}`}>Email me<ArrowUpRight size={20} aria-hidden="true" /></a>
        <p className="fin-address">{contact.email}</p>
        <p className="fin-links"><a href={contact.github} target="_blank" rel="noopener noreferrer">GitHub</a><a href={contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></p>
        <p className="fin-credit">{credit}</p>
      </div>
    </div>
  </section>;
}
