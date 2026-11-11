import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { DUR, EASE } from "../lib/motion";

/* The one counter on the site. A number counts from zero to its real value,
   once, in DUR.slow on the default curve. By itself it starts when it comes
   into view; pass `run` to start it yourself (the work stage does, so a stat
   counts when its panel takes the stage).

   Small numbers and years print as they are: counting to 3, or from 0 to
   2019, reads as noise. So do values with no number in them, and everything
   under reduced motion. Screen readers always get the final value. */
export default function Count({ value, run }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const done = useRef(false);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [, prefix = "", digits = "", suffix = ""] = String(value).match(/^(\D*)(\d+)(.*)$/) || [];
  const target = Number(digits);
  const counts = !!digits && target >= 10 && digits.length < 4 && !reduced;
  const go = run === undefined ? inView : run;
  useEffect(() => {
    const el = ref.current;
    if (!counts || !go || done.current || !el) return undefined;
    done.current = true;
    const controls = animate(0, target, {
      duration: DUR.slow,
      ease: EASE.out,
      onUpdate: (v) => { el.textContent = `${prefix}${Math.round(v)}${suffix}`; },
    });
    // Leaving mid-count (a tab switch) settles on the real value.
    return () => { controls.stop(); el.textContent = value; };
  }, [counts, go, target, prefix, suffix, value]);
  if (!counts) return value;
  return <><span ref={ref} aria-hidden="true" className="ed-count">{value}</span><span className="sr-only">{value}</span></>;
}
