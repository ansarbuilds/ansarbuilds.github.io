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
  const tone = useRef(null);
  tone.current ??= cueOnRise("tone");

  const { failed } = useAct({
    id: "finale",
    playback,
    load: async () => {
      const { createFinale } = await import("./finale/createFinale");
      return (options) => createFinale(canvas.current, options);
    },
    onFrame: (t, m) => {
      tone.current(m.core);
      if (!block.current) return;
      block.current.style.opacity = m.contact;
      block.current.style.visibility = m.contact > 0.02 ? "visible" : "hidden";
      block.current.style.transform = `translateY(${(1 - m.contact) * 16}px)`;
    },
  });

  if (failed) return null;
  return <section className="fin film-act" data-act="finale" aria-labelledby="fin-title">
    <div className="fin-stage">
      <canvas ref={canvas} className="fin-canvas" aria-hidden="true" />
      <div ref={block} className="fin-block">
        <h2 id="fin-title">Let's build <em>something.</em></h2>
        <a className="fin-email" href={`mailto:${contact.email}`}>Email me<ArrowUpRight size={20} aria-hidden="true" /></a>
        <p className="fin-address">{contact.email}</p>
        <p className="fin-links"><a href={contact.github} target="_blank" rel="noopener noreferrer">GitHub</a><a href={contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></p>
        <p className="fin-credit">{credit}</p>
      </div>
    </div>
  </section>;
}
