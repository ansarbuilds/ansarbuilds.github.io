import "./actOne/actOne.css";
import { useRef } from "react";
import ActTitle from "./ActTitle";
import { useAct } from "./useAct";

/* Act I (storyboard A1-01 to A1-03) in the film player: it slides up over
   the hero, and the camera goes through the name and past the numbers.
   The statement is a title card over the frame, real text; the numbers and
   tools are also listed for screen readers. */
export default function ActOne({ playback, receipts, tools, lead, rest }) {
  const card = useRef(null);
  const toolsCaption = useRef(null);
  const canvas = useRef(null);
  const { failed, titleUp } = useAct({
    id: "act1",
    playback,
    load: async () => {
      const [{ createActOne }] = await Promise.all([
        import("./actOne/createActOne"),
        document.fonts?.load("400 108px Anton"),
        document.fonts?.load("500 17px JetBrains Mono"),
      ]);
      return (options) => createActOne(canvas.current, { receipts, tools, ...options });
    },
    onFrame: (t, show) => {
      if (card.current) {
        card.current.style.opacity = show.statement;
        card.current.style.transform = `translateY(${(1 - show.statement) * 18}px)`;
      }
      if (toolsCaption.current) toolsCaption.current.style.opacity = show.tools;
    },
  });

  if (failed) return null;
  return <section className="act1 film-act" data-act="act1" aria-label="The short version">
    <div className="act1-stage">
      <ActTitle up={titleUp}>I. The receipts</ActTitle>
      <canvas ref={canvas} className="act1-canvas" aria-hidden="true" />
      <div ref={card} className="act1-card"><p className="act1-statement">{lead} <em>{rest}</em></p></div>
      <p ref={toolsCaption} className="act1-tools" aria-hidden="true">Tools I build with <span>· point at one</span></p>
    </div>
    <dl className="sr-only">{receipts.map(({ value, label }) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}</dl>
    <p className="sr-only">Tools I build with: {tools.join(", ")}.</p>
  </section>;
}
