import "./finale/finale.css";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { FINALE_CONTACT_AT, FINALE_SCREENS } from "./finale/screens";
import { cueOnRise } from "../lib/sound";

/* The finale on the home page, in place of the Contact section: everything
   recedes into one point of light; then the contact line, the email and the
   links; then the credits roll up into the footer. All of it is real text
   and real links. `#contact` lands on the contact beat, not the receding. */
const SCREENS = FINALE_SCREENS + 1;

export default function Finale({ contact, pitch, credits, onTop, fallback }) {
  const section = useRef(null);
  const canvas = useRef(null);
  const block = useRef(null);
  const roll = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = section.current;
    let film = null, cancelled = false, onScreen = false, loading = false;
    const progress = () => {
      const box = el.getBoundingClientRect();
      const span = box.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -box.top / span)) : 0;
    };
    const tone = cueOnRise("tone");
    const onFrame = (t, m) => {
      tone(m.contact);
      if (block.current) {
        block.current.style.opacity = m.contact;
        block.current.style.visibility = m.contact > 0.02 ? "visible" : "hidden";
        // As the credits roll in, the contact rises to the top and keeps
        // only its line, the email and the links.
        block.current.style.transform = `translateY(${(1 - m.contact) * 24 - m.credits * 30}vh)`;
        block.current.style.setProperty("--fin-detail", 1 - m.credits);
      }
      if (roll.current) {
        roll.current.style.opacity = m.credits;
        roll.current.style.visibility = m.credits > 0.02 ? "visible" : "hidden";
        roll.current.style.transform = `translateY(${(1 - m.credits) * 50}vh)`;
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
      near.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", run);
      film?.dispose();
    };
  }, []);

  if (failed) return fallback;
  return <section ref={section} className="fin" aria-labelledby="fin-title" data-palette="blueBloom" style={{ "--act-screens": SCREENS }}>
    {/* Where #contact lands: the start of the contact beat. */}
    <span id="contact" className="fin-anchor" style={{ top: `calc(${FINALE_CONTACT_AT * FINALE_SCREENS} * 100vh)` }} aria-hidden="true" />
    <div className="fin-stage">
      <canvas ref={canvas} className="fin-canvas" aria-hidden="true" />
      <div ref={block} className="fin-block">
        <p className="fin-kicker">06 · Contact</p>
        <h2 id="fin-title">Let's build <em>something.</em></h2>
        <a className="fin-email" href={`mailto:${contact.email}`}>Email me<ArrowUpRight size={20} aria-hidden="true" /></a>
        <p className="fin-links"><a href={contact.github} target="_blank" rel="noopener noreferrer">GitHub<ExternalLink size={14} aria-hidden="true" /></a><a href={contact.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<ExternalLink size={14} aria-hidden="true" /></a></p>
        <p className="fin-address">{contact.email}</p>
        <p className="fin-pitch">{pitch}</p>
      </div>
      <div ref={roll} className="fin-credits">
        {credits.map(([role, name]) => <p key={role}><span>{role}</span>{name}</p>)}
        <footer className="fin-footer"><span>© {new Date().getFullYear()}</span><span>Designed and built by me, with AI as the pair programmer.</span><button type="button" onClick={onTop}>Back to top ↑</button></footer>
      </div>
    </div>
  </section>;
}
