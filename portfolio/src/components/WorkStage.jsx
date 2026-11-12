import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ExternalLink, Play, RotateCcw } from "lucide-react";
import { FLAGSHIPS } from "../data/showcase";
import { getProject } from "../data/projects";
import { media } from "../lib/media";
import { spring } from "../lib/motion";
import Count from "./Count";
import { usePageVisible } from "../lib/usePageVisible";
import "../stage.css";

/* The flagship work as one stage instead of seven long sections: pick a
   project along the top and try it on the left, read the short version on
   the right. It moves on by itself until the visitor takes over. On small
   screens the tabs drop away and every project is simply stacked.

   Each demo is either the real thing (saywhen plays its launch film; Jarvis runs its sample-data demo in a
   frame; Haloscript shows its own screenshots; PRH-JEPA shows a figure from
   the report) or an illustration that says so (the Flight Recorder replay
   and the Site Recon terminal). */

const coverOf = (project) => project.spotlightArt || project.cardArt || project.cardShot || project.shots?.[0];
const outboundLink = (project) => project.links?.find((link) => link.external && !link.locked);
const reveal = (event) => event.currentTarget.classList.add("is-loaded");

function useDesktop() {
  const query = "(min-width: 1000px)";
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setDesktop(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

// Steps through 0..count-1 on a timer while `run` holds, until the visitor
// picks a step themselves.
function useAutoStep(count, run, ms, loop = true) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!run || held || reduced || (!loop && step === count - 1)) return undefined;
    const id = setInterval(() => setStep((n) => (n + 1) % count), ms);
    return () => clearInterval(id);
  }, [run, held, reduced, count, ms, loop, step]);
  const pick = (n) => { setHeld(true); setStep(n); };
  const replay = () => { setHeld(false); setStep(0); };
  return [step, pick, replay, held || (!loop && step === count - 1)];
}

function Frame({ title, children, className = "" }) {
  return <div className={`st-frame ${className}`}>
    <div className="st-frame-bar" aria-hidden="true"><i /><i /><i /><span>{title}</span></div>
    <div className="st-frame-body">{children}</div>
  </div>;
}

/* saywhen: its launch film, muted and looping while it is on stage. The film
   is an animation, and the frame title says so. The full version with sound
   lives on the project page. */
function SaywhenDemo({ active }) {
  const reduced = useReducedMotion();
  const video = useRef(null);
  const saveData = typeof navigator !== "undefined" && navigator.connection?.saveData;
  const autoplay = !reduced && !saveData;
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    if (active && autoplay) node.play().catch(() => {});
    else node.pause();
  }, [active, autoplay]);
  return <Frame title="saywhen · launch film, animation" className="is-film">
    <video ref={video} src={media("/p/saywhen/demo.mp4")} poster={media("/p/saywhen/poster.jpg")} muted loop playsInline preload="none" controls={!autoplay} aria-label="saywhen launch film: look at the screen, speak a command, check the preview, and it is sent to the terminal" />
    <a className="st-launch" href={media("/p/saywhen/")}><Play size={16} aria-hidden="true" />Watch with sound</a>
  </Frame>;
}

/* Jarvis: the real demo, with made-up sample data, loaded on request. */
function JarvisDemo() {
  const [live, setLive] = useState(false);
  return <Frame title={live ? "jarvis · live demo, sample data" : "jarvis · dashboard, sample data"} className={`is-browser ${live ? "is-live" : ""}`}>
    {live
      ? <iframe src={media("/p/jarvis/demo/index.html")} title="Jarvis demo with sample data" loading="lazy" />
      : <>
        <img className="ed-lazy-media" src={media("/shots/jarvis/dashboard.webp")} alt="Jarvis dashboard with sample data" loading="lazy" onLoad={reveal} />
        <button type="button" className="st-launch" onClick={() => setLive(true)}><Play size={16} aria-hidden="true" />Run the live demo here</button>
      </>}
  </Frame>;
}

/* Flight Recorder: a replay of the kind of run it records. Illustrative. */
const FLIGHT_STEPS = [
  { tag: "read", what: "auth/session.py", note: "The agent opens the session module before changing it.", lines: [[" ", "def refresh(token):"], [" ", "    if token.is_expired():"], [" ", "        raise SessionExpired()"], [" ", "    return rotate(token)"]] },
  { tag: "edit #1", what: "auth/tokens.py", note: "A harmless edit: a new helper, nothing removed.", lines: [["+", "def rotate(token):"], ["+", "    return Token(token.user, ttl=3600)"]] },
  { tag: "edit #2", what: "auth/session.py", note: "It tidies the function and drops the expiry check on the way.", lines: [[" ", "def refresh(token):"], ["-", "    if token.is_expired():"], ["-", "        raise SessionExpired()"], [" ", "    return rotate(token)"]] },
  { tag: "run", what: "pytest", note: "The test suite runs.", lines: [[" ", "41 passed, 1 failed"]] },
  { tag: "failure", what: "test_refresh_token", note: "The final error names the test, not the edit that broke it.", lines: [["-", "AssertionError: expected SessionExpired"]], tone: "bad" },
  { tag: "suspect", what: "edit #2", note: "Flight Recorder ranks the edits and points at this one, with the diff and the failing assertion as evidence.", lines: [["-", "    if token.is_expired():"], ["-", "        raise SessionExpired()"]], tone: "good", points: 2 },
];
function FlightDemo({ active }) {
  const [step, pick, replay, held] = useAutoStep(FLIGHT_STEPS.length, active, 1700, false);
  const current = FLIGHT_STEPS[step];
  return <Frame title="flight-recorder · timeline" className="is-flight">
    <ol className="st-flight-steps" style={{ "--step": step }}><li className="st-playhead" aria-hidden="true" />{FLIGHT_STEPS.map((item, i) => <li key={item.tag}>
      <button type="button" aria-pressed={i === step} className={`${i === step ? "is-on" : ""} ${i < step ? "is-past" : ""} ${item.tone ? `is-${item.tone}` : ""} ${current.points === i ? "is-suspect" : ""}`} onClick={() => pick(i)}>
        <b>{item.tag}</b><span>{item.what}</span>
      </button>
    </li>)}</ol>
    <div className="st-flight-detail" aria-live="polite">
      <p>{current.note}</p>
      <pre key={step}>{current.lines.map(([sign, text], i) => <code key={i} style={{ "--i": i }} className={sign === "+" ? "is-add" : sign === "-" ? "is-del" : ""}>{sign} {text}{"\n"}</code>)}</pre>
      <div className="st-demo-foot"><span>Illustrative run</span>{held && <button type="button" onClick={replay}><RotateCcw size={12} aria-hidden="true" />Replay</button>}</div>
    </div>
  </Frame>;
}

/* PRH-JEPA: the report's own figure, and the one finding worth a toggle. */
function PrhDemo() {
  const [clip, setClip] = useState(true);
  return <Frame title="prh-jepa · figure 2, WIT-1024 baselines" className="is-paper">
    <img className="ed-lazy-media" src={media("/p/prh-jepa/fig2-wit1024-baselines.svg")} alt="Figure 2 from the report: alignment of six open text encoders with DINOv2 on WIT-1024" loading="lazy" onLoad={reveal} />
    <div className="st-clip">
      <button type="button" role="switch" aria-checked={clip} className={clip ? "is-on" : ""} onClick={() => setClip((v) => !v)}><i aria-hidden="true" />Hidden outlier clip {clip ? "on" : "off"}</button>
      <div className="st-clip-bar" aria-hidden="true"><span style={{ transform: `scaleX(${clip ? 1 : 0.65})` }} /></div>
      <strong className="st-clip-caption"><span className={clip ? "is-shown" : ""} aria-hidden={clip ? undefined : "true"}>Reported score</span><span className={clip ? "" : "is-shown"} aria-hidden={clip ? "true" : undefined}>−35% without it</span></strong>
    </div>
  </Frame>;
}

/* Haloscript: its own screenshots on each device. */
const HALO_SHOTS = [
  { device: "Mac", src: "/shots/haloscript/write_mac.jpg", alt: "Haloscript writing view on a Mac" },
  { device: "iPad", src: "/shots/haloscript/corkboard_ipad.jpg", alt: "Haloscript corkboard on an iPad" },
  { device: "iPhone", src: "/shots/haloscript/home_iphone.jpg", alt: "Haloscript home screen on an iPhone" },
];
function HaloDemo({ active }) {
  const [shot, pick] = useAutoStep(HALO_SHOTS.length, active, 3200, false);
  return <div className="st-devices">
    <div className="st-shells">
      {HALO_SHOTS.map((item, i) => <div key={item.device} className={`st-shell is-${item.device.toLowerCase()} ${i === shot ? "is-shown" : ""}`} aria-hidden={i === shot ? undefined : "true"}>
        <div className="st-shell-screen"><img className="ed-lazy-media" src={media(item.src)} alt={i === shot ? item.alt : ""} loading="lazy" onLoad={reveal} /></div>
      </div>)}
    </div>
    <div className="st-device-tabs" role="group" aria-label="Device">{HALO_SHOTS.map((item, i) => <button key={item.device} type="button" aria-pressed={i === shot} className={i === shot ? "is-on" : ""} onClick={() => pick(i)}>{item.device}</button>)}</div>
  </div>;
}

/* Digital Me: the cover, and a way in to the live model. */
function DigitalDemo({ project }) {
  return <div className="st-cover">
    <img className="ed-lazy-media" src={media(coverOf(project))} alt="" loading="lazy" onLoad={reveal} />
    <a href="#digital-double" className="st-launch"><Play size={16} aria-hidden="true" />Meet the live 3D model</a>
  </div>;
}

/* Site Recon: an illustrated inspection that prints itself. */
function ReconDemo({ flag, active }) {
  const lines = flag.visual?.lines || [];
  return <Frame title="site-recon · inspect" className={`is-term ${active ? "is-running" : ""}`}>
    <ol className="st-term">{lines.map(([tone, text], i) => {
      const [key, ...rest] = text.split(/\s{2,}/);
      return <li key={text} className={`is-${tone}`} style={{ "--i": i }}><b>{key}</b><span>{rest.join(" ")}</span></li>;
    })}<li className="st-caret" style={{ "--i": lines.length }} aria-hidden="true" /></ol>
    <div className="st-demo-foot"><span>Illustrative inspection</span></div>
  </Frame>;
}

const DEMOS = {
  saywhen: SaywhenDemo,
  jarvis: JarvisDemo,
  "agent-flight-recorder": FlightDemo,
  "prh-jepa": PrhDemo,
  haloscript: HaloDemo,
  "digital-double": DigitalDemo,
  "site-recon": ReconDemo,
};

// Tab labels have to fit seven across, so two titles get a short form.
const TAB_TITLE = { "agent-flight-recorder": "Flight Recorder", "prh-jepa": "PRH-JEPA" };
const STAGE = FLAGSHIPS.map((flag) => ({ flag, project: getProject(flag.slug) })).filter((item) => item.project);

export default function WorkStage() {
  const reduced = useReducedMotion();
  const desktop = useDesktop();
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.35 });
  const pageVisible = usePageVisible();
  const live = inView && pageVisible;
  // Which project is on stage, and which way the stage last moved (1 is
  // forward), so the incoming copy can slide in from that side.
  const [{ active, dir }, setStage] = useState({ active: 0, dir: 1 });
  const goTo = (index) => setStage((now) => ({ active: index, dir: index >= now.active ? 1 : -1 }));
  // Once the visitor picks a project, the stage stops moving on by itself.
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState(false);

  const choose = (index) => { setHeld(true); goTo(index); };

  // Links to #card-<slug> (the project pages' back links, the command
  // palette) select that project.
  useEffect(() => {
    const onHash = () => {
      const index = STAGE.findIndex(({ flag }) => window.location.hash === `#card-${flag.slug}`);
      if (index >= 0) { setHeld(true); setStage((now) => ({ active: index, dir: index >= now.active ? 1 : -1 })); }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const onKey = (event) => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!move) return;
    event.preventDefault();
    const next = (active + move + STAGE.length) % STAGE.length;
    choose(next);
    ref.current?.querySelectorAll("[role='tab']")[next]?.focus();
  };

  const auto = desktop && live && !held && !reduced;
  return <div ref={ref} className={`st ${auto && !hover ? "" : "is-paused"} ${held ? "is-held" : ""} ${live ? "" : "is-resting"}`} style={{ "--dir": dir }} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
    <div className="st-tabs" role="tablist" aria-label="Flagship projects" onKeyDown={onKey}>
      {STAGE.map(({ flag, project }, i) => <button key={flag.slug} type="button" role="tab" id={`st-tab-${flag.slug}`} aria-selected={i === active} aria-controls={`card-${flag.slug}`} tabIndex={i === active ? 0 : -1} className={`st-tab ${i === active ? "is-active" : ""}`} onClick={() => choose(i)}>
        <span className="st-tab-num">{String(i + 1).padStart(2, "0")}</span>
        <strong>{TAB_TITLE[flag.slug] || project.title}</strong>
        <small>{flag.eyebrow}</small>
        <span className="st-tab-bar" aria-hidden="true">{i === active && <i onAnimationEnd={() => setStage((now) => ({ active: (now.active + 1) % STAGE.length, dir: 1 }))} />}</span>
        {/* One highlight shared by all the tabs: it slides to the active one. */}
        {i === active && <motion.span layoutId="st-tab-active" className="st-tab-active" aria-hidden="true" transition={reduced ? { duration: 0 } : spring("light")} />}
      </button>)}
    </div>
    <div className="st-panels">
      {STAGE.map(({ flag, project }, i) => {
        const Demo = DEMOS[flag.slug];
        const shown = !desktop || i === active;
        const outbound = outboundLink(project);
        return <article key={flag.slug} id={`card-${flag.slug}`} role={desktop ? "tabpanel" : undefined} aria-labelledby={desktop ? `st-tab-${flag.slug}` : undefined} className={`st-panel ${shown ? "is-active" : ""}`} inert={!shown}>
          <div className="st-demo">{Demo ? <Demo flag={flag} project={project} active={shown && live} /> : <div className="st-cover"><img className="ed-lazy-media" src={media(coverOf(project))} alt="" loading="lazy" onLoad={reveal} /></div>}</div>
          <div className="st-info">
            <p className="st-eyebrow"><span>{String(i + 1).padStart(2, "0")} / {String(STAGE.length).padStart(2, "0")}</span><em><i aria-hidden="true" />{flag.badge}</em></p>
            <h3><a href={`#project/${project.slug}`}>{project.title}</a></h3>
            <p className="st-headline">{flag.headline}</p>
            <p className="st-copy">{flag.copy}</p>
            <dl className="st-stats">{flag.stats.map(([value, label]) => <div key={label}><dt><Count value={value} run={shown && live} /></dt><dd>{label}</dd></div>)}</dl>
            <ul className="st-stack" aria-label="Built with">{flag.stack.map((tool) => <li key={tool}>{tool}</li>)}</ul>
            <div className="st-ctas">
              <a className="sc-btn" href={`#project/${project.slug}`}>Read the case study<ArrowUpRight size={18} aria-hidden="true" /></a>
              {outbound && <a className="sc-btn-ghost" href={outbound.href} target="_blank" rel="noopener noreferrer">{outbound.label}<ExternalLink size={15} aria-hidden="true" /></a>}
            </div>
          </div>
        </article>;
      })}
    </div>
  </div>;
}
