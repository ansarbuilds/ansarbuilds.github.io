import { useEffect, useRef, useState } from "react";

const GLYPHS = "01%#/_[]<>+=-";

/* Subtle heading text-scramble when scrolled into view.
   Keeps aria-label intact and immediately renders final text
   under prefers-reduced-motion. */
export default function ScrambleText({ text, className = "" }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let raf = 0;
    let played = false;

    const run = () => {
      const start = performance.now();
      const dur = 420;
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const locked = Math.floor(p * text.length);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === " " || i < locked) out += ch;
          else out += GLYPHS[(i + Math.floor(now / 45)) % GLYPHS.length];
        }
        setDisplay(out);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setDisplay(text);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || played) return;
      played = true;
      run();
      io.disconnect();
    }, { threshold: 0.25 });

    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
