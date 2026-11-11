import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import SignalField from "./SignalField";
import WorkStage from "./WorkStage";
import { CODE, CONTACT, HERO, RECEIPTS, ROLES } from "../data/content";
import { EXPERIMENTS, LISTED_PROJECTS, getProject } from "../data/projects";
import { CAPABILITIES, FLAGSHIPS, MORE_WORK, STACK_MARQUEE } from "../data/showcase";
import { EASE, STAGGER, tween } from "../lib/motion";
import { INTRO_SESSION_KEY } from "../lib/intro";
import { media } from "../lib/media";
import Count from "./Count";
import MagneticLink from "./Magnetic";
import { ScrollContext, useRoute } from "../appContexts";
import "../editorial.css";
import "../showcase.css";

const revealImage = (event) => event.currentTarget.classList.add("is-loaded");

/* The one reveal on the page. It only adds "is-in" when about a third of the
   element is on screen (less for things taller than the screen), once; the
   motion itself is CSS (.rv in showcase.css), so a heading, a card and its
   image all start from the same moment. `index` staggers siblings in
   reading order. Reduced motion is "in" from the first paint. */
function Enter({ children, className = "", index = 0, style, ...rest }) {
  const reduced = useReducedMotion();
  const scrollRef = useContext(ScrollContext);
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    const root = scrollRef?.current || null;
    const rootHeight = root?.clientHeight || window.innerHeight;
    // 30% of the element, or 30% of the screen for anything taller than it.
    const threshold = Math.min(0.3, (rootHeight * 0.3) / Math.max(1, el.offsetHeight));
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShown(true);
      observer.disconnect();
    }, { root, threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, scrollRef]);
  return <div ref={ref} {...rest} style={{ "--i": index, ...style }} className={`rv ${className} ${shown || reduced ? "is-in" : ""}`}>{children}</div>;
}
function IndexLabel({ number, children }) {
  return <p className="ed-label"><span>{number}</span>{children}</p>;
}
/* Four flagships as a status strip. It does not rotate: the hero already
   has one thing moving. A card lights up when it is hovered or focused. */
const HERO_FEED = FLAGSHIPS.slice(0, 4);
function HeroFeed({ appear, from }) {
  return <nav className="sc-feed" aria-label="Flagship projects">{HERO_FEED.map((flag, i) => {
    const project = getProject(flag.slug);
    return project && <motion.a key={flag.slug} href={`#project/${project.slug}`} className="sc-feed-card" data-cursor="Open" {...appear(from + i * (STAGGER.base / STAGGER.loose))}>
      <span className="sc-feed-status"><i aria-hidden="true" />{flag.badge}</span>
      <strong>{project.title}</strong>
      <span className="sc-feed-metric"><b>{flag.stats[0][0]}</b>{flag.stats[0][1]}</span>
    </motion.a>;
  })}</nav>;
}

// The viewport's height, kept current, for scroll ranges that scale with it.
function useViewportHeight() {
  const [height, setHeight] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return height;
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

/* The hero, and on a first visit the intro that hands over to it.

   There is no curtain. On a first visit the hero itself is the title card:
   everything but the name is held back, and the name sits large in the
   middle of the screen. Its two lines rise out of their masks, then the
   name travels to its real place (it is the same h1 throughout, so it lands
   exactly) while the rest arrives in reading order: kicker, sentence,
   buttons, proof cards, and the network last. Any click, key or scroll
   skips straight to the end. A return visit plays the same entrance without
   the travel. */
const NAME_SET_S = 0.62; // how long the name holds centre stage before it moves
const NAME_TRAVEL = { duration: 0.75, ease: EASE.out };
export function Hero({ ready = true, onReady }) {
  const reduced = useReducedMotion();
  const scrollRef = useContext(ScrollContext);
  const heroRef = useRef(null);
  const nameRef = useRef(null);
  const visible = useInView(heroRef, { margin: "50px" });
  // `ready` is false only on a first visit, before the intro has handed over.
  const [intro] = useState(() => !ready && !reduced);
  const [arrived, setArrived] = useState(!intro);
  const nameX = useMotionValue(0), nameY = useMotionValue(0), nameScale = useMotionValue(1);

  // Before the first paint, move the name from its place to mid-screen.
  const placed = useRef(false);
  useLayoutEffect(() => {
    // Measure once, from the name's untransformed box. A second run (React
    // re-runs effects in development) would measure the moved name instead.
    if (!intro || !nameRef.current || placed.current) return;
    placed.current = true;
    const box = nameRef.current.getBoundingClientRect();
    nameX.set(window.innerWidth / 2 - (box.left + box.width / 2));
    nameY.set(window.innerHeight / 2 - (box.top + box.height / 2));
    nameScale.set(Math.min(1.22, Math.max(1, (window.innerWidth * 0.84) / box.width)));
  }, [intro, nameX, nameY, nameScale]);

  useEffect(() => {
    if (!intro) { onReady?.(); return undefined; }
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      window.localStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch { /* storage unavailable: shouldPlayIntro already said no */ }
    let moves = [];
    let handed = false;
    const handOver = () => {
      if (handed) return;
      handed = true;
      setArrived(true);
      onReady?.();
    };
    // The name leaves for its place; the rest starts a beat into the move.
    const travel = setTimeout(() => {
      moves = [animate(nameX, 0, NAME_TRAVEL), animate(nameY, 0, NAME_TRAVEL), animate(nameScale, 1, NAME_TRAVEL)];
    }, NAME_SET_S * 1000);
    const rest = setTimeout(handOver, (NAME_SET_S + 0.18) * 1000);
    const skip = () => {
      clearTimeout(travel);
      moves.forEach((move) => move.stop());
      nameX.set(0); nameY.set(0); nameScale.set(1);
      handOver();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((name) => window.addEventListener(name, skip, { once: true, passive: true }));
    return () => {
      clearTimeout(travel);
      clearTimeout(rest);
      events.forEach((name) => window.removeEventListener(name, skip));
    };
  }, [intro, onReady, nameX, nameY, nameScale]);

  // The hint only appears if the hero has sat untouched for a while, and
  // goes for good at the first click.
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!arrived || !visible || reduced) return undefined;
    const id = setTimeout(() => setHint(true), 7000);
    return () => clearTimeout(id);
  }, [arrived, visible, reduced]);

  // As the hero scrolls away, the copy lifts and fades while the network
  // swells slightly, so the page seems to move through it. The ranges are
  // fractions of the viewport height (the hero is one viewport, pinned on
  // desktop while the next section slides over it), not fixed pixels.
  const vh = useViewportHeight();
  const { scrollY } = useScroll({ container: scrollRef });
  const copyY = useTransform(scrollY, [0, vh * 0.9], reduced ? [0, 0] : [0, -vh * 0.16]);
  const copyOpacity = useTransform(scrollY, [0, vh * 0.62], reduced ? [1, 1] : [1, 0]);
  const feedY = useTransform(scrollY, [0, vh * 0.9], reduced ? [0, 0] : [0, -vh * 0.07]);
  const feedOpacity = useTransform(scrollY, [vh * 0.09, vh * 0.7], reduced ? [1, 1] : [1, 0]);
  const fieldScale = useTransform(scrollY, [0, vh], reduced ? [1, 1] : [1, 1.14]);
  const fieldOpacity = useTransform(scrollY, [0, vh], reduced ? [1, 1] : [1, 0.3]);

  // One timeline. The name's lines lead; each later part is a step behind
  // the one before. Without the intro, the rest waits for the name to be
  // well on its way.
  const lead = intro ? 0 : 0.28;
  const appear = (step) => (reduced ? {} : {
    initial: { opacity: 0, y: 16 },
    animate: arrived ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: tween("slow", "out", lead + step * STAGGER.loose),
  });
  const line = (i) => (reduced ? {} : {
    initial: { y: "106%", skewY: 5 },
    animate: { y: "0%", skewY: 0 },
    transition: tween("slow", "out", i * STAGGER.loose),
  });
  return <div className="sc-open">
    <section ref={heroRef} id="hero" aria-labelledby="hero-name" className="sc-hero" data-palette="lumen" onPointerDown={() => setHint(false)}>
      <motion.div className="sc-hero-stage" style={{ scale: fieldScale, opacity: fieldOpacity }}>
        {/* The network comes up last, once everything it sits behind is in. */}
        <motion.div className="sc-hero-fade" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: arrived ? 1 : 0 }} transition={tween("scene", "out", lead + 0.4)}><SignalField className="sc-hero-field" labels={HERO_LABELS} /></motion.div>
      </motion.div>
      <div className="sc-hero-grid" aria-hidden="true" />
      <motion.div className="sc-hero-inner" style={{ y: copyY, opacity: copyOpacity }}>
        <motion.p className="sc-hero-kicker" {...appear(0)}><i aria-hidden="true" />Index of work · {CODE.asOf}</motion.p>
        <motion.h1 ref={nameRef} id="hero-name" className="sc-hero-name" aria-label="Mohamed Ansar" style={{ x: nameX, y: nameY, scale: nameScale }}>
          <span className="sc-name-line" aria-hidden="true"><motion.span {...line(0)}>MOHAMED</motion.span></span>
          <span className="sc-name-line" aria-hidden="true"><motion.span className="is-outline" {...line(1)}>ANSAR</motion.span></span>
        </motion.h1>
        <motion.p className="sc-hero-line" {...appear(1)}>{HERO.title} <em>Here are {LISTED_PROJECTS.length} of them.</em></motion.p>
        <motion.div className="sc-hero-ctas" {...appear(2)}>
          <MagneticLink href="#projects" className="sc-hero-btn">See the work<ArrowDown size={18} aria-hidden="true" /></MagneticLink>
          <a href="#contact" className="sc-hero-ghost">Get in touch<ArrowUpRight size={16} aria-hidden="true" /></a>
          <span className={`sc-hero-hint ${hint ? "is-shown" : ""}`} aria-hidden="true">Click the network</span>
        </motion.div>
      </motion.div>
      <motion.div className="sc-hero-bottom" style={{ y: feedY, opacity: feedOpacity }}><HeroFeed appear={appear} from={3} /></motion.div>
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
   scroll fast and it rushes and leans a couple of degrees, scroll back and it reverses. The
   second copy only exists so the loop has no seam; reduced motion gets a
   still, wrapping list instead. */
function VelocityMarquee({ items, label, className = "", speed = 1.1 }) {
  const scrollRef = useContext(ScrollContext);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef });
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-1500, 0, 1500], [-5, 0, 5], { clamp: false });
  const skewX = useTransform(velocity, [-2600, 2600], [2, -2]);
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

/* A section that arrives as a sheet sliding over the one before it: a
   rounded top edge and a hairline, the same language as the page sliding
   over the hero. It is plain CSS (.sc-sheet), so it costs nothing per
   scroll frame. It used to animate a clip-path inset on every frame. */
function Sheet({ children }) {
  return <div className="sc-sheet">{children}</div>;
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
  return <Sheet><section id="capabilities" className="sc-caps ed-section" data-palette="field"><div className="ed-wrap">
    <Enter className="ed-section-heading"><div><IndexLabel number="03">What I bring</IndexLabel><h2>Three things,<br /><em>done properly.</em></h2></div><p className="ed-heading-aside">The same loop on every build: make it work, measure it honestly, and ship it to real people.</p></Enter>
    <div className="sc-cap-grid">{CAPABILITIES.map((cap, i) => <Enter key={cap.id} index={i} className="sc-cap">
      <p className="sc-cap-count"><Count value={cap.count} /></p>
      <p className="sc-cap-unit">{cap.unit}</p>
      <h3>{cap.title}</h3>
      <p className="sc-cap-copy">{cap.copy}</p>
      <ul>{cap.proof.map((slug) => { const project = getProject(slug); return project && <li key={slug}><a href={`#project/${slug}`}>{project.title}<ArrowUpRight size={14} aria-hidden="true" /></a></li>; })}</ul>
    </Enter>)}</div>
  </div></section></Sheet>;
}

function WorkCard({ item, index }) {
  const project = getProject(item.slug);
  const [broken, setBroken] = useState(false);
  if (!project) return null;
  const cover = coverOf(project);
  return <Enter index={index % 3}>
    <a id={`card-${project.slug}`} href={`#project/${project.slug}`} className="sc-card" data-cursor="View">
      <div className="sc-card-media">
        {cover && !broken ? <img className="ed-lazy-media" src={media(cover)} alt="" loading="lazy" onLoad={revealImage} onError={() => setBroken(true)} /> : <span className="sc-card-type" aria-hidden="true">{project.title}</span>}
        <span className="sc-card-kind">{project.kind}</span>
      </div>
      <div className="sc-card-body">
        <h3>{project.title}<ArrowUpRight size={20} aria-hidden="true" /></h3>
        {item.metric && <p className="sc-card-metric"><strong><Count value={item.metric} /></strong><span>{item.unit}</span></p>}
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
  return <Sheet><section id="ai" className="ed-experiments ed-section" data-palette="neon"><div className="ed-wrap">
    <Enter className="ed-section-heading"><div><IndexLabel number="05">The playground</IndexLabel><h2>What if<br /><em>I tried this?</em></h2></div><p className="ed-heading-aside">Interactive experiments built with AI as a pair programmer. Open one and have a play.</p></Enter>
    <div className="ed-experiment-grid">{EXPERIMENTS.map((experiment, i) => <Enter key={experiment.id} index={i}><a href={experiment.href} className="ed-experiment" data-cursor="Play"><div className="ed-experiment-image"><ExperimentImage experiment={experiment} /><span>0{i + 1} / Interactive</span></div><div className="ed-experiment-title"><h3>{experiment.title}</h3><ArrowUpRight size={22} /></div><p>{experiment.hook}</p><span className="ed-experiment-cta">{experiment.cta}<ArrowRight size={16} /></span></a></Enter>)}</div>
  </div></section></Sheet>;
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
    <div className="ed-contact-bottom"><MagneticLink href={`mailto:${CONTACT.email}`} className="ed-contact-email">Email me<ArrowUpRight aria-hidden="true" /></MagneticLink><div><p>I like the hard part: agents that have to be trusted, evals that have to be honest, and products that have to ship. If that sounds like your problem, write to me.</p><div className="ed-socials"><a href={CONTACT.github} target="_blank" rel="noopener noreferrer">GitHub<ExternalLink size={14} /></a><a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<ExternalLink size={14} /></a></div></div></div>
    <div id="experience" className="bd-dayjobs"><span>Day jobs</span><ul>{ROLES.map((role) => <li key={role.company + role.title}>{role.title} at {role.company}</li>)}</ul></div>
    <footer className="ed-footer"><span>© {new Date().getFullYear()}</span><span>Designed and built by me, with AI as the pair programmer.</span><button onClick={() => navigate("deck")} aria-label="Back to top">Back to top ↑</button></footer></div></section>;
}
