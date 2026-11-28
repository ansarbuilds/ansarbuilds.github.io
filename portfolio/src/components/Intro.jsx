import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO_BEATS } from "../data/site";
import { markIntroSeen } from "../lib/intro";
import { setFieldBoost } from "../lib/fieldBoost";

/* The intro: about seven seconds over the light field, once per visit.

   Three beats (data/site.js): the name, what I build, what I'm building
   now. Each line sets letter by letter out of a blur and leaves upward.
   Then the field calms and the page rises in. Any key, click or tap skips
   it, and so does the Skip button. The page underneath is in the document
   the whole time (only hidden), so nothing waits on the intro. */

const EXIT_MS = 650;

function Line({ text, big }) {
  // Split into words, then letters, so a line wraps between words only.
  let n = 0;
  return (
    <p className={`ab-intro-line ${big ? "is-big" : ""}`} aria-hidden="true">
      {text.split(" ").map((word, w, words) => (
        <span key={w}>
          <span className="ab-intro-word">
            {[...word].map((ch, i) => <span className="ab-intro-ch" style={{ "--n": n++ }} key={i}>{ch}</span>)}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  );
}

export default function Intro({ onDone }) {
  const [beat, setBeat] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const total = INTRO_BEATS.reduce((sum, b) => sum + b.ms, 0);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    markIntroSeen();
    setLeaving(true);
    setFieldBoost(1);
    setTimeout(onDone, EXIT_MS);
  }, [onDone]);

  useEffect(() => {
    setFieldBoost(1.55);
    const timers = [];
    let at = 0;
    INTRO_BEATS.forEach((b, i) => {
      if (i > 0) timers.push(setTimeout(() => setBeat(i), at));
      at += b.ms;
    });
    timers.push(setTimeout(finish, at));
    const skip = (event) => {
      if (event.type === "keydown" && ["Shift", "Control", "Alt", "Meta", "Tab"].includes(event.key)) return;
      finish();
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
    };
  }, [finish]);

  const current = INTRO_BEATS[beat];
  return (
    <div className={`ab-intro ${leaving ? "is-leaving" : ""}`} role="dialog" aria-label="Intro" aria-live="polite">
      <p className="sr-only">{INTRO_BEATS.map((b) => b.text).join(". ")}</p>
      <div className="ab-intro-stage">
        <div className="ab-intro-beat" key={current.id} style={{ "--hold": `${current.ms}ms` }}>
          <Line text={current.text} big={current.id === "name"} />
        </div>
      </div>
      <div className="ab-intro-foot">
        <span className="ab-intro-progress" style={{ "--total": `${total}ms` }} aria-hidden="true"><span /></span>
        <button type="button" className="ab-intro-skip" onClick={finish}>Skip intro</button>
      </div>
    </div>
  );
}
