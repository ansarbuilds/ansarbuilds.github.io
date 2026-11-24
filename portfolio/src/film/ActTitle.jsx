import "./actTitle.css";
import { Fragment } from "react";

/* An act's title card ("II. Six builds"): real text, set in the display
   face, rising out of a mask as the act begins and leaving soon after.
   It is plain text, so it is not in the keyboard order. The rise is a timed
   reveal from the motion tokens; `up` says when (see useAct.js). */
// `as` sets the element: an act whose own heading is not on screen yet (Act
// II) uses its title as that heading.
export default function ActTitle({ up, children, as: Tag = "p" }) {
  const words = String(children).split(" ");
  return <Tag className={`film-act-title${up ? " is-up" : ""}`}>
    {/* Real spaces between the words, so it reads as one line. */}
    {words.map((word, i) => <Fragment key={i}>{i > 0 && " "}<span className="film-act-word" style={{ "--i": i }}>{word}</span></Fragment>)}
  </Tag>;
}
