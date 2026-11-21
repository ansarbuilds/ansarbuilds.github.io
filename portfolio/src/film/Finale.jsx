import "./keyboard.css";
import "./finale/finale.css";
import { trackQuiet } from "./quiet";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { FINALE_CONTACT_AT, FINALE_SCREENS } from "./finale/screens";
import { cueOnRise } from "../lib/sound";

/* The finale on the home page, in place of the Contact section: one point of
   light, then the line, one button, the address and two quiet links. The long
   pitch and the footer sit below the pinned stage in the document, so they
   are real and readable but not on the poster. `#contact` lands on the line,
   not on the black before it. */
const SCREENS = FINALE_SCREENS + 1;

export default function Finale({ contact, pitch, credit, onTop, fallback }) {
  const section = useRef(null);
  const canvas = useRef(null);
  const block = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = section.current;
    const untrack = trackQuiet(el.querySelector(".fin-stage"));
    let film = null, cancelled = false, onScreen = false, loading = false;
    const progress = () => {
      const box = el.getBoundingClientRect();
      const span = box.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 0;
    };
    const tone = cueOnRise("tone");
    const onFrame = (t, m) => {
      tone(m.core);
      if (block.current) {
        block.current.style.opacity = m.contact;
        block.current.style.visibility = "visible";
        block.current.classList.add("film-card");
        block.current.classList.toggle("is-offshot", m.contact <= 0.02);
        block.current.style.transform = `translateY(${(1 - m.contact) * 16}px)`;
      }
    };
    const run = () => film?.setActive(onScreen && document.visibilityState === "visible");
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const { createFinale } = await import("./finale/createFinale");
        if (cancelled) return;
        film = createFinale(canvas.current, { getProgress: progress, onFrame });
        el.classList.add("is-live");
        run();
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { near.disconnect(); load(); } }, { rootMargin: "0px 0px 150% 0px" });
    const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; run(); });
    near.observe(el);
    seen.observe(el);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      untrack();
      near.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", run);
      film?.dispose();
    };
  }, []);

  if (failed) return fallback;
  return <>
    <section ref={section} className="fin" aria-labelledby="fin-title" data-palette="blueBloom" style={{ "--act-screens": SCREENS }}>
      {/* Where #contact lands: the start of the line. */}
      <span id="contact" className="fin-anchor" style={{ top: `calc(${FINALE_CONTACT_AT * FINALE_SCREENS} * 100vh)` }} aria-hidden="true" />
      <div className="fin-stage" data-film-stage="finale">
        <canvas ref={canvas} className="fin-canvas" aria-hidden="true" />
        <div ref={block} className="fin-block">
          <h2 id="fin-title">Let's build <em>something.</em></h2>
          <a className="fin-email" href={`mailto:${contact.email}`}>Email me<ArrowUpRight size={20} aria-hidden="true" /></a>
          <p className="fin-address">{contact.email}</p>
          <p className="fin-links"><a href={contact.github} target="_blank" rel="noopener noreferrer">GitHub</a><a href={contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></p>
          <p className="fin-credit">{credit}</p>
        </div>
      </div>
    </section>
    <div className="fin-doc">
      <p className="fin-pitch">{pitch}</p>
      <footer className="fin-footer"><span>© {new Date().getFullYear()}</span><span>Designed and built by me, with AI as the pair programmer.</span><button type="button" onClick={onTop}>Back to top ↑</button></footer>
    </div>
  </>;
}
