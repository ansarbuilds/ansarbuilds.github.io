import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { PROMPT, RUN } from "../data/hedwigRun";

/* The home page's hero visual: a real recorded run of the 13.8M Hedwig
   model, replayed one token at a time. Under the story, the three tokens
   it was choosing between, each probability drawn as a row of square
   dots (one dot per 5%). When it samples something other than its top
   choice, the panel says so. Nothing here is generated on the page; it
   is the same recording Hedwig's own page uses. Pauses off-screen;
   reduced motion shows one still step. */
const STEP_MS = 280;
const REST_MS = 3200;
const DOTS = 20;
// A step worth showing when nothing moves: " an", where it took its
// second choice at 11%.
const STILL_STEP = RUN.findIndex(([piece, top]) => top[0][0] !== piece) + 1 || RUN.length;

const show = (token) => JSON.stringify(token).slice(1, -1).replace(/^ /, "␣");

export default function HedwigTrace() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const [step, setStep] = useState(1);
  const n = reduced ? STILL_STEP : step;

  useEffect(() => {
    if (reduced) return undefined;
    const el = ref.current;
    let timer = 0;
    let visible = false;
    let at = 1;
    const tick = () => {
      if (!visible) return;
      at = at >= RUN.length ? 1 : at + 1;
      setStep(at);
      timer = window.setTimeout(tick, at === RUN.length ? REST_MS : STEP_MS);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      window.clearTimeout(timer);
      if (visible) timer = window.setTimeout(tick, STEP_MS);
    });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, [reduced]);

  const [piece, top] = RUN[n - 1];
  const rank = top.findIndex(([token]) => token === piece);

  return (
    <figure ref={ref} className="ht" aria-label="A recorded run of Hedwig, the language model I trained, writing a story one token at a time">
      <figcaption className="ht-head">
        <span>Hedwig 13.8M · a recorded run</span>
        <span>temp 0.7</span>
      </figcaption>
      <p className="ht-prompt"><span aria-hidden="true">&gt;</span> {PROMPT}</p>
      <p className="ht-story">
        <span className="sr-only">{RUN.map((r) => r[0]).join("")}</span>
        <span aria-hidden="true">
          {RUN.slice(0, n).map(([p], i) => (
            <span key={i} className={i === n - 1 ? "ht-now" : undefined}>{p}</span>
          ))}
          <span className="ht-caret" />
        </span>
      </p>
      <div className="ht-probs" aria-hidden="true">
        <p className="ht-probs-h">
          <span>token {String(n).padStart(2, "0")} / {RUN.length}</span>
          <span className={rank > 0 ? "ht-flag is-on" : "ht-flag"}>{rank > 0 ? `sampled choice #${rank + 1}` : "took the top choice"}</span>
        </p>
        {top.map(([token, pct], i) => {
          const lit = Math.round(pct / (100 / DOTS));
          return (
            <div key={i} className={token === piece ? "ht-row is-pick" : "ht-row"}>
              <span className="ht-tok">{show(token)}</span>
              <span className="ht-dots">
                {Array.from({ length: DOTS }, (_, d) => <i key={d} className={d < lit ? "on" : undefined} />)}
              </span>
              <span className="ht-pct">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
