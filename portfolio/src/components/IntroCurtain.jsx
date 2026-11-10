import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE_REVEAL } from "../lib/motion";
import { INTRO_SESSION_KEY } from "../lib/intro";

const NAME = "Mohamed Ansar";
// A fast-in, fast-out curve for the curtain itself: it should feel like a
// shutter lifting, not drift.
const CURTAIN_EASE = [0.76, 0, 0.24, 1];

/* A blink of a title card on a first visit only: the name rises, a hairline
   draws across, and the curtain lifts. It covers the page for well under
   half a second (HOLD + LIFT), so the first thing a visitor reads is the
   hero. onReveal fires as it starts lifting (so the hero can animate in
   underneath it), onGone once it has cleared the screen. Click to skip. */
const HOLD_MS = 140;
const LIFT_S = 0.3;
export default function IntroCurtain({ onReveal, onGone }) {
  const [lifting, setLifting] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      window.localStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch {
      /* storage unavailable: shouldPlayIntro already handled that case */
    }
    const t = setTimeout(() => setLifting(true), HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (lifting) onReveal();
  }, [lifting, onReveal]);

  return (
    <motion.div
      aria-hidden="true"
      onClick={() => setLifting(true)}
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={lifting ? { clipPath: "inset(0% 0% 100% 0%)" } : undefined}
      transition={{ duration: LIFT_S, ease: CURTAIN_EASE }}
      onAnimationComplete={() => lifting && onGone()}
      className="fixed inset-0 z-[400] grid place-items-center bg-ink px-5"
    >
      <div className="text-center">
        <motion.div
          className="overflow-hidden whitespace-nowrap font-condensed uppercase leading-[.95] text-ivory text-[clamp(2.35rem,11vw,11rem)]"
          initial="hidden"
          animate="shown"
          transition={{ staggerChildren: 0.006 }}
        >
          {NAME.split("").map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              variants={{ hidden: { y: "110%" }, shown: { y: "0%" } }}
              transition={{ duration: 0.2, ease: EASE_REVEAL }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </motion.div>
        <motion.div
          className="mx-auto mt-5 h-px origin-left bg-coral"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.2, ease: EASE_REVEAL }}
        />
      </div>
    </motion.div>
  );
}
