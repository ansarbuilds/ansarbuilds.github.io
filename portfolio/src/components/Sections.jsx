import { useContext, useEffect, useRef, useState } from "react";
import { animate, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import SignalField from "./SignalField";
import WorkStage from "./WorkStage";
import { CODE, CONTACT, HERO, RECEIPTS, ROLES } from "../data/content";
import { EXPERIMENTS, LISTED_PROJECTS, getProject } from "../data/projects";
import { CAPABILITIES, FLAGSHIPS, MORE_WORK, STACK_MARQUEE } from "../data/showcase";
import { EASE_OUT, EASE_REVEAL } from "../lib/motion";
import { usePageVisible } from "../lib/usePageVisible";
import { media } from "../lib/media";
import { magnetic, trackPointer } from "../lib/pointerFx";
import { ScrollContext, useRoute } from "../appContexts";
import "../editorial.css";
import "../showcase.css";

const revealImage = (event) => event.currentTarget.classList.add("is-loaded");

// "is-in" lets CSS run the slower media reveals (cover apertures, image
// settle) off the same trigger as the fade, so both start together.
function Enter({ children, className = "", delay = 0, ...rest }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  return <motion.div {...rest} className={`${className} ${shown || reduced ? "is-in" : ""}`} initial={reduced ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} onViewportEnter={() => setShown(true)} viewport={{ once: true, amount: 0, margin: "0px 0px 20% 0px" }} transition={{ duration: 0.3, delay: Math.min(delay, 0.06), ease: EASE_REVEAL }}>{children}</motion.div>;
}
/* A stat that counts up the first time it comes into view. Small numbers
   and years print as they are: counting to 2, or from 0 to 2019, reads as
   noise. Screen readers get the final value only. */
function CountUp({ value }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [, prefix = "", digits = "", suffix = ""] = String(value).match(/^(\D*)(\d+)(.*)$/) || [];
  const target = Number(digits);
  const counts = digits && target >= 10 && digits.length < 4 && !reduced;
  // Start most of the way there: a fast scroll past "0+" reads as a broken
  // stat, while the last stretch still gives the number its tick.
  const start = Math.round(target * 0.6);
  useEffect(() => {
    if (!counts || !inView || !ref.current) return;
    const controls = animate(start, target, {
      duration: Math.min(1.4, 0.7 + target / 600),
      ease: EASE_REVEAL,
      onUpdate: (v) => { if (ref.current) ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [counts, inView, start, target, prefix, suffix]);
  if (!counts) return value;
  return <><span ref={ref} aria-hidden="true" className="ed-count">{`${prefix}${inView ? target : start}${suffix}`}</span><span className="sr-only">{value}</span></>;
}
function IndexLabel({ number, children }) {
  return <p className="ed-label"><span>{number}</span>{children}</p>;
}
/* The name prints itself: each letter cycles through random glyphs, then
   locks in, left to right. Screen readers get the plain name from the h1. */
const DECODE_GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>#*+";
function DecodeLine({ text, run, delay = 0, className = "" }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (reduced || !run) return undefined;
    let raf = 0;
    const startAt = performance.now() + delay;
    const tick = (now) => {
      const t = now - startAt;
      if (t >= 0) {
        let done = true;
        const out = [...text].map((ch, i) => {
          if (t >= i * 45 + 240) return ch;
          done = false;
          return t < i * 20 ? "\u00a0" : DECODE_GLYPHS[Math.floor(Math.random() * DECODE_GLYPHS.length)];
        }).join("");
        setShown(out);
        if (done) return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, text, delay, reduced]);
  return <span className={className} aria-hidden="true">{reduced ? text : shown || "\u00a0"}</span>;
}

/* Four flagships as a live status strip. One card at a time takes the
   spotlight, with a light sweep across it. */
const HERO_FEED = FLAGSHIPS.slice(0, 4);
function HeroFeed({ run, ready, delay }) {
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!run || reduced || !pageVisible) return undefined;
    const id = setInterval(() => setActive((n) => (n + 1) % HERO_FEED.length), 2600);
    return () => clearInterval(id);
  }, [run, reduced, pageVisible]);
  // The cards rise 12px one after another, 70ms apart, last in the hero's entrance.
  const rise = (i) => (reduced ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.45, delay: delay + i * 0.07, ease: EASE_OUT },
  });
  return <nav className="sc-feed" aria-label="Flagship projects">{HERO_FEED.map((flag, i) => {
    const project = getProject(flag.slug);
    return project && <motion.a key={flag.slug} href={`#project/${project.slug}`} className={`sc-feed-card ${i === active ? "is-active" : ""}`} data-cursor="Open" {...rise(i)}>
      <span className="sc-feed-status"><i aria-hidden="true" />{flag.badge}</span>
      <strong>{project.title}</strong>
      <span className="sc-feed-metric"><b>{flag.stats[0][0]}</b>{flag.stats[0][1]}</span>
      <span className="sc-feed-scan" aria-hidden="true" />
      <span className="sc-feed-timer" aria-hidden="true" />
    </motion.a>;
  })}</nav>;
}

/* Copy that lights up word by word as it crosses the screen. Every word is
   in the page from the start, only dimmed, so nothing is hidden from
   readers, search or reduced motion (which gets it fully lit). */
function ScrubWord({ progress, range, children }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}
function ScrubText({ lead, rest, className }) {
  const scrollRef = useContext(ScrollContext);
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ container: scrollRef, target: ref, offset: ["start 0.9", "start 0.3"] });
  const leadWords = lead.split(" "), restWords = rest.split(" ");
  const total = leadWords.length + restWords.length;
  const word = (text, i) => (reduced ? `${text} ` : <ScrubWord key={i} progress={scrollYProgress} range={[i / total, (i + 1) / total]}>{text}</ScrubWord>);
  return <p ref={ref} className={className}>{leadWords.map(word)}<em>{restWords.map((text, i) => word(text, leadWords.length + i))}</em></p>;
}

export function Hero({ ready = true }) {
  const reduced = useReducedMotion();
  const scrollRef = useContext(ScrollContext);
  const heroRef = useRef(null);
  const visible = useInView(heroRef, { margin: "50px" });
  const run = ready && visible;
  // As the hero scrolls away, the copy lifts and fades while the network
  // swells slightly, so the page seems to move through it.
  // Measured in pixels, not against the hero's own box: on desktop the hero
  // is pinned while the next section slides over it, so its box never moves.
  const { scrollY } = useScroll({ container: scrollRef });
  const copyY = useTransform(scrollY, [0, 800], reduced ? [0, 0] : [0, -150]);
  const copyOpacity = useTransform(scrollY, [0, 560], reduced ? [1, 1] : [1, 0]);
  const feedY = useTransform(scrollY, [0, 800], reduced ? [0, 0] : [0, -60]);
  const feedOpacity = useTransform(scrollY, [80, 620], reduced ? [1, 1] : [1, 0]);
  const fieldScale = useTransform(scrollY, [0, 900], reduced ? [1, 1] : [1, 1.3]);
  const fieldOpacity = useTransform(scrollY, [0, 900], reduced ? [1, 1] : [1, 0.3]);
  // The entrance, in order: kicker, the name decoding, the sentence, the two
  // buttons, then the four proof cards.
  const appear = (delay) => (reduced ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.45, delay, ease: EASE_OUT },
  });
  return <div className="sc-open">
    <section ref={heroRef} id="hero" aria-labelledby="hero-name" className="sc-hero" data-palette="lumen" onPointerMove={trackPointer}>
      <motion.div className="sc-hero-stage" style={{ scale: fieldScale, opacity: fieldOpacity }}><SignalField className="sc-hero-field" labels={HERO_LABELS} /></motion.div>
      <div className="sc-hero-grid" aria-hidden="true" />
      <div className="sc-hero-spot" aria-hidden="true" />
      <motion.div className="sc-hero-inner" style={{ y: copyY, opacity: copyOpacity }}>
        <motion.p className="sc-hero-kicker" {...appear(0)}><i aria-hidden="true" />Index of work · {CODE.asOf}</motion.p>
        <h1 id="hero-name" className="sc-hero-name" aria-label="Mohamed Ansar"><DecodeLine text="MOHAMED" run={run} delay={80} /><DecodeLine text="ANSAR" run={run} delay={200} className="is-outline" /></h1>
        <motion.p className="sc-hero-line" {...appear(0.5)}>{HERO.title} <em>Here are {LISTED_PROJECTS.length} of them.</em></motion.p>
        <motion.div className="sc-hero-ctas" {...appear(0.62)}>
          <a href="#projects" className="sc-hero-btn" {...magnetic}>See the work<ArrowDown size={18} aria-hidden="true" /></a>
          <a href="#contact" className="sc-hero-ghost">Get in touch<ArrowUpRight size={16} aria-hidden="true" /></a>
          <span className="sc-hero-hint" aria-hidden="true">Click the network</span>
        </motion.div>
      </motion.div>
      <motion.div className="sc-hero-bottom" style={{ y: feedY, opacity: feedOpacity }}><HeroFeed run={run} ready={ready} delay={0.76} /></motion.div>
    </section>
    <section className="ed-intro ed-light sc-brief" aria-label="The short version" data-palette="lumen">
      <div className="ed-wrap">
        <ScrubText className="sc-statement" lead="Most AI demos stop at the demo." rest="Mine ship with tests, real numbers and a write-up, including the parts that failed." />
        <dl className="sc-receipts">{RECEIPTS.map((item) => <div key={item.label}><dt>{item.value === "PROJECTS" ? `${LISTED_PROJECTS.length}+` : item.value}</dt><dd>{item.label}</dd></div>)}</dl>
      </div>
      <StackMarquee />
    </section>
  </div>;
}

// Named beside a burst when the hero network is clicked, in this order.
const HERO_LABELS = ["Jarvis", "Flight Recorder", "PRH-JEPA", "Haloscript"];

/* A row that never stops, and takes its speed and lean from the scroll:
   scroll fast and it rushes and skews, scroll back and it reverses. The
   second copy only exists so the loop has no seam; reduced motion gets a
   still, wrapping list instead. */
function VelocityMarquee({ items, label, className = "", speed = 1.1 }) {
  const scrollRef = useContext(ScrollContext);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef });
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-1500, 0, 1500], [-5, 0, 5], { clamp: false });
  const skewX = useTransform(velocity, [-2600, 2600], [9, -9]);
  const offset = useMotionValue(0);
  const direction = useRef(1);
  const rowRef = useRef(null);
  const onScreen = useInView(rowRef);
  useAnimationFrame((_, delta) => {
    if (reduced || !onScreen) return;
    const push = boost.get();
    if (push < -0.2) direction.current = -1;
    else if (push > 0.2) direction.current = 1;
    let next = offset.get() - direction.current * speed * (Math.min(delta, 64) / 1000) * (1 + Math.abs(push));
    if (next <= -50) next += 50;
    else if (next > 0) next -= 50;
    offset.set(next);
  });
  const x = useTransform(offset, (value) => `${value}%`);
  return <div ref={rowRef} className={`sc-marquee ${className}`}><motion.div className="sc-marquee-track" style={reduced ? undefined : { x, skewX }}>
    {[0, 1].map((copy) => <ul key={copy} aria-label={copy ? undefined : label} aria-hidden={copy ? "true" : undefined}>
      {items.map((item, i) => <li key={`${item}-${i}`}>{item}<span aria-hidden="true">✳</span></li>)}
    </ul>)}
  </motion.div></div>;
}
const StackMarquee = () => <VelocityMarquee items={STACK_MARQUEE} label="Tools I build with" />;

/* Dark sections arrive as a rounded card and widen to the full page as they
   scroll in. The wrapper paints the paper colour behind the corners. */
function Expand({ children }) {
  const scrollRef = useContext(ScrollContext);
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ container: scrollRef, target: ref, offset: ["start end", "start 0.3"] });
  const clipPath = useTransform(scrollYProgress, (p) => `inset(0 ${((1 - p) * 6).toFixed(2)}% 0 ${((1 - p) * 6).toFixed(2)}% round ${Math.round((1 - p) * 56)}px ${Math.round((1 - p) * 56)}px 0 0)`);
  return <div ref={ref} className="sc-expand"><motion.div style={reduced ? undefined : { clipPath }}>{children}</motion.div></div>;
}

const coverOf = (project) => project.spotlightArt || project.cardArt || project.cardShot || project.shots?.[0];
export function ProjectsSection() {
  return <section id="projects" className="ed-projects ed-light ed-section" data-palette="bloom">
    <div className="ed-section-watermark" aria-hidden="true">WORK</div>
    <div className="ed-wrap">
      <Enter className="ed-section-heading sc-stage-heading"><div><IndexLabel number="02">Selected work</IndexLabel><h2>Don’t read about it. <em>Try it.</em></h2></div><div className="ed-heading-aside"><p>Six builds, each one live on this page: run the agent, replay the failure, flip the finding, switch the device.</p></div></Enter>
      <WorkStage />
    </div>
  </section>;
}

export function CapabilitiesSection() {
  return <Expand><section id="capabilities" className="sc-caps ed-section" data-palette="field"><div className="ed-wrap">
    <Enter className="ed-section-heading"><div><IndexLabel number="03">What I bring</IndexLabel><h2>Three things,<br /><em>done properly.</em></h2></div><p className="ed-heading-aside">The same loop on every build: make it work, measure it honestly, and ship it to real people.</p></Enter>
    <div className="sc-cap-grid">{CAPABILITIES.map((cap, i) => <Enter key={cap.id} delay={i * 0.06} className="sc-cap" onPointerMove={trackPointer}>
      <p className="sc-cap-count"><CountUp value={cap.count} /></p>
      <p className="sc-cap-unit">{cap.unit}</p>
      <h3>{cap.title}</h3>
      <p className="sc-cap-copy">{cap.copy}</p>
      <ul>{cap.proof.map((slug) => { const project = getProject(slug); return project && <li key={slug}><a href={`#project/${slug}`}>{project.title}<ArrowUpRight size={14} aria-hidden="true" /></a></li>; })}</ul>
    </Enter>)}</div>
  </div></section></Expand>;
}

function WorkCard({ item, index }) {
  const project = getProject(item.slug);
  const [broken, setBroken] = useState(false);
  if (!project) return null;
  const cover = coverOf(project);
  return <Enter delay={(index % 3) * 0.06} style={{ "--i": index % 3 }}>
    <a id={`card-${project.slug}`} href={`#project/${project.slug}`} className="sc-card" data-cursor="View">
      <div className="sc-card-media">
        {cover && !broken ? <img className="ed-lazy-media" src={media(cover)} alt="" loading="lazy" onLoad={revealImage} onError={() => setBroken(true)} /> : <span className="sc-card-type" aria-hidden="true">{project.title}</span>}
        <span className="sc-card-kind">{project.kind}</span>
      </div>
      <div className="sc-card-body">
        <h3>{project.title}<ArrowUpRight size={20} aria-hidden="true" /></h3>
        {item.metric && <p className="sc-card-metric"><strong><CountUp value={item.metric} /></strong><span>{item.unit}</span></p>}
        <p className="sc-card-line">{item.line}</p>
        <p className="sc-card-status">{project.status}</p>
      </div>
    </a>
  </Enter>;
}

const SHOWN = new Set([...FLAGSHIPS, ...MORE_WORK].map((item) => item.slug));
const ALSO_BUILT = LISTED_PROJECTS.filter((project) => !SHOWN.has(project.slug));

export function MoreWorkSection() {
  return <section id="more" className="sc-more ed-light ed-section" data-palette="lumora"><div className="ed-wrap">
    <Enter className="ed-section-heading"><div><IndexLabel number="04">More shipped work</IndexLabel><h2>And plenty<br /><em>more shipped.</em></h2></div><p className="ed-heading-aside">Studies, agent skills, data pipelines and apps. Every card opens a full write-up.</p></Enter>
    <div className="sc-card-grid">{MORE_WORK.map((item, i) => <WorkCard key={item.slug} item={item} index={i} />)}</div>
    {ALSO_BUILT.length > 0 && <details className="sc-also">
      <summary><span>Also built</span><small>{ALSO_BUILT.length} more, from internal tools to early experiments</small></summary>
      <ul>{ALSO_BUILT.map((project) => <li key={project.slug}><a id={`card-${project.slug}`} href={`#project/${project.slug}`}><strong>{project.title}</strong><span>{project.kind}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>)}</ul>
    </details>}
  </div></section>;
}

// Keep the real screenshot as a fallback if a decorative cover cannot load.
function ExperimentImage({ experiment }) {
  const [artBroken, setArtBroken] = useState(false);
  return <img className="ed-lazy-media" src={media(!artBroken && experiment.cardArt ? experiment.cardArt : experiment.shot)} alt="" width={1200} height={900} loading="lazy" onLoad={revealImage} onError={() => setArtBroken(true)} />;
}

export function ExperimentsSection() {
  return <Expand><section id="ai" className="ed-experiments ed-section" data-palette="neon"><div className="ed-wrap">
    <Enter className="ed-section-heading"><div><IndexLabel number="05">The playground</IndexLabel><h2>What if<br /><em>I tried this?</em></h2></div><p className="ed-heading-aside">Interactive experiments built with AI as a pair programmer. Open one and have a play.</p></Enter>
    <div className="ed-experiment-grid">{EXPERIMENTS.map((experiment, i) => <Enter key={experiment.id} delay={i * 0.07}><a href={experiment.href} className="ed-experiment" data-cursor="Play"><div className="ed-experiment-image"><ExperimentImage experiment={experiment} /><span>0{i + 1} / Interactive</span></div><div className="ed-experiment-title"><h3>{experiment.title}</h3><ArrowUpRight size={22} /></div><p>{experiment.hook}</p><span className="ed-experiment-cta">{experiment.cta}<ArrowRight size={16} /></span></a></Enter>)}</div>
  </div></section></Expand>;
}

/* The last shot: the address itself is the biggest thing in the section,
   and the network behind it sends its signals in to that address once,
   then goes quiet. The jobs are a footnote on purpose: title and company,
   one quiet line under everything else. */
export function ContactSection() {
  const { navigate } = useRoute();
  return <section id="contact" className="ed-contact sc-contact" data-palette="blueBloom"><SignalField className="sc-contact-field" quiet gatherTo=".sc-email" /><div className="ed-wrap">
    <IndexLabel number="06">Contact</IndexLabel>
    <h2>Building something <em>ambitious?</em></h2>
    <a href={`mailto:${CONTACT.email}`} className="sc-email" data-cursor="Write">{CONTACT.email}</a>
    <div className="ed-contact-bottom"><a href={`mailto:${CONTACT.email}`} className="ed-contact-email" {...magnetic}>Email me<ArrowUpRight aria-hidden="true" /></a><div><p>I like the hard part: agents that have to be trusted, evals that have to be honest, and products that have to ship. If that sounds like your problem, write to me.</p><div className="ed-socials"><a href={CONTACT.github} target="_blank" rel="noopener noreferrer">GitHub<ExternalLink size={14} /></a><a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<ExternalLink size={14} /></a></div></div></div>
    <div id="experience" className="bd-dayjobs"><span>Day jobs</span><ul>{ROLES.map((role) => <li key={role.company + role.title}>{role.title} at {role.company}</li>)}</ul></div>
    <footer className="ed-footer"><span>© {new Date().getFullYear()}</span><span>Designed and built by me, with AI as the pair programmer.</span><button onClick={() => navigate("deck")} aria-label="Back to top">Back to top ↑</button></footer></div></section>;
}
