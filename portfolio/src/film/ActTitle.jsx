import { useState } from "react";

/* An act's title ("I. The receipts"), set like a trailer's: a flare streaks
   across, the numeral slams in out of a blur in gold, the name's letters
   close in from wide and blurred with a sheen crossing them, a rule draws
   out under it and "Chapter" sits above. Leaving, the letters fly apart.
   It is plain text ("I. The receipts" to a screen reader), not in the
   keyboard order; `up` says when it shows (see useAct.js). `as` sets the
   element, for an act that uses its title as its heading. Its styles,
   actTitle.css, load with the film player (it only shows there), not with
   the page. */
export default function ActTitle({ up, numeral, children, as: Tag = "p" }) {
  const letters = Array.from(String(children));
  // Once it has been up, going down is a leaving (with its own animation).
  const [shown, setShown] = useState(false);
  if (up && !shown) setShown(true);
  return <Tag className={`film-act-title${up ? " is-up" : shown ? " is-out" : ""}`}>
    <span className="film-act-flare" aria-hidden="true" />
    {numeral && <><span className="film-act-num">{numeral}.</span>{" "}</>}
    <span className="film-act-name">
      {letters.map((ch, i) => <span key={i} className={ch === " " ? "film-act-gap" : "film-act-letter"} style={{ "--i": i, "--n": letters.length }}>{ch}</span>)}
    </span>
    <span className="film-act-rule" aria-hidden="true" />
  </Tag>;
}
