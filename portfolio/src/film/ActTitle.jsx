import "./actTitle.css";
import { Fragment, useEffect, useState } from "react";

/* An act's title card ("II. Seven builds"): real text, set in the display
   face, rising out of a mask as the act begins and leaving soon after.
   It is never hidden from screen readers (only faded), and it is plain
   text, so it is not in the keyboard order. The rise is a timed reveal
   from the motion tokens, triggered by the act starting, not scrubbed by
   the scrollbar. `section` is the act's section; the card shows while the
   act is pinned and in its first `share` of scrolling. */
// `as` sets the element: an act whose own heading is not on screen yet (Act
// II) uses its title as that heading.
export default function ActTitle({ section, children, share = 0.08, as: Tag = "p" }) {
  const [up, setUp] = useState(false);
  const words = String(children).split(" ");
  useEffect(() => {
    const el = section.current;
    if (!el) return undefined;
    let frame = 0;
    const check = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const span = box.height - window.innerHeight;
      const progress = span > 0 ? -box.top / span : 0;
      setUp(box.top <= 1 && progress < share);
    };
    const onScroll = () => { frame ||= requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [section, share]);
  return <Tag className={`film-act-title${up ? " is-up" : ""}`}>
    {/* Real spaces between the words, so it reads as one line. */}
    {words.map((word, i) => <Fragment key={i}>{i > 0 && " "}<span className="film-act-word" style={{ "--i": i }}>{word}</span></Fragment>)}
  </Tag>;
}
