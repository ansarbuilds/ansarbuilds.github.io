import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, ExternalLink, Play } from "lucide-react";
import TelemetryFieldCanvas from "./TelemetryFieldCanvas";
import WorkStage from "./WorkStage";
import { CODE, CONTACT, HERO, RECEIPTS } from "../data/content";
import { EXPERIMENTS, LISTED_PROJECTS, getProject } from "../data/projectIndex";
import { CAPABILITIES, FLAGSHIPS, MORE_WORK, STACK_MARQUEE } from "../data/showcase";
import { EASE, STAGGER, tween } from "../lib/motion";
import { INTRO_SESSION_KEY, filmEnabled, watchFilm } from "../lib/intro";
import { media } from "../lib/media";
import Count from "./Count";
import MagneticLink from "./Magnetic";
import { useRoute } from "../appContexts";
import "../editorial.css";
import "../showcase.css";

const revealImage = (event) => event.currentTarget.classList.add("is-loaded");

/* Smooth editorial scroll reveal using IntersectionObserver.
   Reduced motion is visible immediately from first paint. */
function Enter({ children, className = "", index = 0, style, ...rest }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return undefined;
    const threshold = 0.05;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShown(true);
      observer.disconnect();
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);
  return <div ref={ref} {...rest} style={{ "--i": index, ...style }} className={`rv ${className} ${shown || reduced ? "is-in" : ""}`}>{children}</div>;
}

/* Precision architectural section index label */
function IndexLabel({ number, children }) {
  return (
    <p className="ed-label">
      <span className="ed-label-num">{number}</span>
      <span className="ed-label-rule" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/* Four-column precision index strip of flagship builds */
const HERO_FEED = FLAGSHIPS.slice(0, 4);
function HeroFeed({ appear, from }) {
  return (
    <div className="sc-feed-wrap">
      <div className="sc-feed-head">
        <p className="sc-feed-kicker"><span>01</span> Flagship index</p>
        <a href="/work/" className="sc-feed-all">All {LISTED_PROJECTS.length} builds <ArrowUpRight size={13} aria-hidden="true" /></a>
      </div>
      <nav className="sc-feed" aria-label="Flagship projects">
        {HERO_FEED.map((flag, i) => {
          const project = getProject(flag.slug);
          return project && (
            <motion.a key={flag.slug} href={`/work/${project.slug}/`} className="sc-feed-card" data-cursor="Open" {...appear(from + i * (STAGGER.base / STAGGER.loose))}>
              <div className="sc-feed-top">
                <span className="sc-feed-status"><i aria-hidden="true" />{flag.badge}</span>
                <span className="sc-feed-idx">0{i + 1}</span>
              </div>
              <strong>{project.title}</strong>
              <span className="sc-feed-metric"><b>{flag.stats[0][0]}</b>{flag.stats[0][1]}</span>
            </motion.a>
          );
        })}
      </nav>
    </div>
  );
}

function ScrubWord({ progress, range, children }) {
  const opacity = useTransform(progress, range, [0.42, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}
function ScrubText({ lead, rest, className }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.3"] });
  const leadWords = lead.split(" "), restWords = rest.split(" ");
  const total = leadWords.length + restWords.length;
  const word = (text, i) => (reduced ? `${text} ` : <ScrubWord key={i} progress={scrollYProgress} range={[i / total, (i + 1) / total]}>{text}</ScrubWord>);
  return <p ref={ref} className={className}>{leadWords.map(word)}<em>{restWords.map((text, i) => word(text, leadWords.length + i))}</em></p>;
}

const STATEMENT = { lead: "Most AI demos stop at the demo.", rest: "Mine ship with tests, real numbers and a write-up, including the parts that failed." };
const RECEIPT_VALUES = RECEIPTS.map((item) => ({ ...item, value: item.value === "PROJECTS" ? `${LISTED_PROJECTS.length}+` : item.value }));

function textBox(el) {
  const own = el.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(el);
  const text = range.getBoundingClientRect();
  return text.width ? { left: text.left, width: text.width, top: own.top, height: own.height } : own;
}
const NAME_SET_S = 0.62;
const NAME_TRAVEL = { duration: 0.75, ease: EASE.out };

export function Hero({ ready = true, hold = false, onReady }) {
  const reduced = useReducedMotion();
  const heroRef = useRef(null);
  const nameRef = useRef(null);
  const [intro] = useState(() => !ready && !reduced);
  const [arrived, setArrived] = useState(!intro);
  const nameX = useMotionValue(0), nameY = useMotionValue(0), nameScale = useMotionValue(1);

  const placed = useRef(false);
  useLayoutEffect(() => {
    if (!intro || !nameRef.current || placed.current) return;
    placed.current = true;
    const box = textBox(nameRef.current);
    nameX.set(window.innerWidth / 2 - (box.left + box.width / 2));
    nameY.set(window.innerHeight / 2 - (box.top + box.height / 2));
    nameScale.set(Math.min(1.16, Math.max(1, (window.innerWidth * 0.78) / Math.max(1, box.width))));
  }, [intro, nameX, nameY, nameScale]);

  useEffect(() => {
    if (!intro) { onReady?.(); return undefined; }
    if (hold) return undefined;
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      window.localStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch { /* storage unavailable */ }
    let moves = [];
    let handed = false;
    const handOver = () => {
      if (handed) return;
      handed = true;
      setArrived(true);
      onReady?.();
    };
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
  }, [intro, hold, onReady, nameX, nameY, nameScale]);

  const lead = intro ? 0 : 0.1;
  const appear = (step) => (reduced ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: arrived ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: tween("slow", "out", lead + step * STAGGER.base),
  });
  const line = (i) => (reduced ? {} : {
    initial: { y: "100%" },
    animate: { y: "0%" },
    transition: tween("slow", "out", i * 0.1),
  });

  const [film] = useState(filmEnabled);

  const brief = (
    <section className="ed-intro ed-light sc-brief" aria-label="The short version" data-palette="lumen">
      <div className="ed-wrap">
        <ScrubText className="sc-statement" lead={STATEMENT.lead} rest={STATEMENT.rest} />
        <dl className="sc-receipts">
          {RECEIPT_VALUES.map((item) => (
            <div key={item.label}>
              <dt>{item.value}</dt>
              <dd>{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
      <StackMarquee />
    </section>
  );

  return (
    <div className="sc-open">
      <section ref={heroRef} id="hero" aria-labelledby="hero-name" className="sc-hero" data-palette="lumen">
        <div className="ed-wrap sc-hero-grid-layout">
          <div className="sc-hero-inner">
            <motion.p className="sc-hero-kicker" {...appear(0)}>
              <i aria-hidden="true" />
              <span>{HERO.eyebrow} · Index of work · {CODE.asOf}</span>
            </motion.p>
            <motion.h1 ref={nameRef} id="hero-name" className="sc-hero-name" aria-label="Mohamed Ansar" style={{ x: nameX, y: nameY, scale: nameScale }}>
              <span className="sc-name-line" aria-hidden="true"><motion.span {...line(0)}>Mohamed</motion.span></span>
              <span className="sc-name-line" aria-hidden="true"><motion.span className="is-accent" {...line(1)}>Ansar</motion.span></span>
            </motion.h1>
            <motion.p className="sc-hero-line" {...appear(1)}>
              {HERO.title} <em className="sc-nowrap">Here are {LISTED_PROJECTS.length} of them.</em>
            </motion.p>
            <motion.div className="sc-hero-ctas" {...appear(2)}>
              <MagneticLink href="#projects" className="sc-hero-btn">
                See the work<ArrowDown size={16} aria-hidden="true" />
              </MagneticLink>
              <a href="#contact" className="sc-hero-ghost">
                Get in touch<ArrowUpRight size={15} aria-hidden="true" />
              </a>
              {film && (
                <button type="button" className="sc-hero-ghost sc-hero-film" onClick={watchFilm}>
                  <Play size={13} aria-hidden="true" />Watch the film
                </button>
              )}
            </motion.div>
          </div>

          <motion.div className="sc-hero-visual" {...appear(1)}>
            <TelemetryFieldCanvas />
          </motion.div>
        </div>

        <div className="ed-wrap sc-hero-bottom">
          <HeroFeed appear={appear} from={3} />
        </div>
      </section>
      {brief}
    </div>
  );
}

/* Velocity-aware stack ribbon */
function VelocityMarquee({ items, label, className = "", speed = 1.05 }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-1500, 0, 1500], [-4, 0, 4], { clamp: false });
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
  return (
    <div ref={rowRef} className={`sc-marquee ${className}`}>
      <motion.div className="sc-marquee-track" style={reduced ? undefined : { x }}>
        {[0, 1].map((copy) => (
          <ul key={copy} aria-label={copy ? undefined : label} aria-hidden={copy ? "true" : undefined}>
            {items.map((item, i) => <li key={`${item}-${i}`}>{item}<span aria-hidden="true">·</span></li>)}
          </ul>
        ))}
      </motion.div>
    </div>
  );
}
const StackMarquee = () => <VelocityMarquee items={STACK_MARQUEE} label="Tools I build with" />;

function Sheet({ children }) {
  return <div className="sc-sheet">{children}</div>;
}

const coverOf = (project) => project.spotlightArt || project.cardArt || project.cardShot || project.shots?.[0];

export function ProjectsSection() {
  return (
    <section id="projects" className="ed-projects ed-light ed-section" data-palette="bloom">
      <div className="ed-wrap">
        <Enter className="ed-section-heading sc-stage-heading">
          <div>
            <IndexLabel number="02">Selected work</IndexLabel>
            <h2>Six builds. <em>Each with its numbers.</em></h2>
          </div>
          <div className="ed-heading-aside">
            <p>Each one has the number, the picture and a way in. Some you can run, some you watch, some you read.</p>
          </div>
        </Enter>
        <WorkStage />
      </div>
    </section>
  );
}

export function CapabilitiesSection() {
  return <PlainCapabilities />;
}

/* Split monograph section: obsidian blueprint panel on the left,
   precision metric rows on the right. */
function PlainCapabilities() {
  return (
    <Sheet>
      <section id="capabilities" className="sc-caps ed-section" data-palette="field">
        <div className="ed-wrap">
          <div className="sc-caps-split">
            <Enter className="sc-caps-panel at-obsidian-grid">
              <IndexLabel number="03">What I bring</IndexLabel>
              <h2>Three things, <br /><em>done properly.</em></h2>
              <p className="sc-caps-aside">The same loop on every build: make it work, measure it honestly, and ship it to real people.</p>
              <div className="sc-caps-meta" aria-hidden="true">
                <span>DISCIPLINE // 03 TRACKS</span>
                <span>VERIFIED IN CODE</span>
              </div>
            </Enter>
            <div className="sc-cap-rows">
              {CAPABILITIES.map((cap, i) => (
                <Enter key={cap.id} index={i} className="sc-cap-row">
                  <div className="sc-cap-row-stat">
                    <p className="sc-cap-count"><Count value={cap.count} /></p>
                    <p className="sc-cap-unit">{cap.unit}</p>
                  </div>
                  <div className="sc-cap-row-body">
                    <h3>{cap.title}</h3>
                    <p className="sc-cap-copy">{cap.copy}</p>
                    <ul className="sc-cap-proof">
                      {cap.proof.map((slug) => {
                        const project = getProject(slug);
                        return project && (
                          <li key={slug}>
                            <a href={`/work/${slug}/`}>{project.title}<ArrowUpRight size={13} aria-hidden="true" /></a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </Enter>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Sheet>
  );
}

function WorkCard({ item, index }) {
  const project = getProject(item.slug);
  const [broken, setBroken] = useState(false);
  if (!project) return null;
  const cover = item.art || coverOf(project);
  return (
    <Enter index={index % 3}>
      <a id={`card-${project.slug}`} href={`/work/${project.slug}/`} className="sc-card" data-cursor="View">
        <div className="sc-card-plate">
          <div className="sc-card-media">
            {cover && !broken ? (
              <img className={`ed-lazy-media ${item.art ? "is-poster" : ""}`} src={media(cover)} alt="" loading="lazy" onLoad={revealImage} onError={() => setBroken(true)} />
            ) : (
              <span className="sc-card-type" aria-hidden="true">{project.title}</span>
            )}
          </div>
          <div className="sc-card-plate-bar">
            <span className="sc-card-kind">{project.kind}</span>
            <span className="sc-card-status-chip">{project.status}</span>
          </div>
        </div>
        <div className="sc-card-body">
          <h3>{project.title}<ArrowUpRight size={18} aria-hidden="true" /></h3>
          {item.metric && <p className="sc-card-metric"><strong><Count value={item.metric} /></strong><span>{item.unit}</span></p>}
          <p className="sc-card-line">{item.line}</p>
        </div>
      </a>
    </Enter>
  );
}

const SHOWN = new Set([...FLAGSHIPS, ...MORE_WORK].map((item) => item.slug));
const ALSO_BUILT = LISTED_PROJECTS.filter((project) => !SHOWN.has(project.slug));

export function MoreWorkSection() {
  return (
    <section id="more" className="sc-more ed-light ed-section" data-palette="lumora">
      <div className="ed-wrap">
        <Enter className="ed-section-heading">
          <div>
            <IndexLabel number="04">More shipped work</IndexLabel>
            <h2>And plenty <br /><em>more shipped.</em></h2>
          </div>
          <p className="ed-heading-aside">Studies, an agent skill and apps. Every card opens a full write-up.</p>
        </Enter>
        <div className="sc-card-grid">
          {MORE_WORK.map((item, i) => <WorkCard key={item.slug} item={item} index={i} />)}
        </div>
        {ALSO_BUILT.length > 0 && (
          <details className="sc-also">
            <summary>
              <span>Also built</span>
              <small>{ALSO_BUILT.length} more, from internal tools to early experiments</small>
            </summary>
            <ul>
              {ALSO_BUILT.map((project) => (
                <li key={project.slug}>
                  <a id={`card-${project.slug}`} href={`/work/${project.slug}/`}>
                    <strong>{project.title}</strong>
                    <span>{project.kind}</span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

function ExperimentImage({ experiment }) {
  const [artBroken, setArtBroken] = useState(false);
  return <img className="ed-lazy-media" src={media(!artBroken && experiment.cardArt ? experiment.cardArt : experiment.shot)} alt="" width={1200} height={900} loading="lazy" onLoad={revealImage} onError={() => setArtBroken(true)} />;
}

const FILM_EXPERIMENTS = ["solar", "stars", "emet"].map((id) => EXPERIMENTS.find((e) => e.id === id)).filter(Boolean);
export function PlaygroundSection() {
  return (
    <section id="ai" className="ed-projects ed-light ed-section" aria-labelledby="playground-title" data-palette="neon">
      <div className="ed-wrap">
        <Enter className="ed-section-heading">
          <div>
            <IndexLabel number="05">Playground</IndexLabel>
            <h2 id="playground-title">Rooms off <em>the hall.</em></h2>
          </div>
          <div className="ed-heading-aside">
            <p>Small things I built to try an idea. Each one opens on its own page.</p>
          </div>
        </Enter>
        <div className="sc-card-grid is-three">
          {FILM_EXPERIMENTS.map((experiment, i) => (
            <Enter key={experiment.id} index={i}>
              <a href={experiment.href} className="sc-card">
                <div className="sc-card-plate">
                  <div className="sc-card-media"><ExperimentImage experiment={experiment} /></div>
                  <div className="sc-card-plate-bar">
                    <span className="sc-card-kind">0{i + 1} / Interactive</span>
                    <span className="sc-card-status-chip">Open room</span>
                  </div>
                </div>
                <div className="sc-card-body">
                  <h3>{experiment.title}<ArrowUpRight size={18} aria-hidden="true" /></h3>
                  <p className="sc-card-line">{experiment.hook}</p>
                </div>
              </a>
            </Enter>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ExperimentsSection() {
  return (
    <Sheet>
      <section id="ai" className="ed-experiments ed-section" data-palette="neon">
        <div className="ed-wrap">
          <Enter className="ed-section-heading">
            <div>
              <IndexLabel number="05">The playground</IndexLabel>
              <h2>What if <br /><em>I tried this?</em></h2>
            </div>
            <p className="ed-heading-aside">Interactive experiments built with AI as a pair programmer. Open one and have a play.</p>
          </Enter>
          <div className="ed-experiment-grid">
            {EXPERIMENTS.map((experiment, i) => (
              <Enter key={experiment.id} index={i}>
                <a href={experiment.href} className="ed-experiment" data-cursor="Play">
                  <div className="ed-experiment-image">
                    <ExperimentImage experiment={experiment} />
                    <span>0{i + 1} / Interactive</span>
                  </div>
                  <div className="ed-experiment-title">
                    <h3>{experiment.title}</h3>
                    <ArrowUpRight size={20} />
                  </div>
                  <p>{experiment.hook}</p>
                  <span className="ed-experiment-cta">{experiment.cta}<ArrowRight size={15} /></span>
                </a>
              </Enter>
            ))}
          </div>
        </div>
      </section>
    </Sheet>
  );
}

export function ContactSection() {
  return <PlainContact />;
}

/* Deep Slate-Obsidian colophon & contact section */
function PlainContact() {
  const { navigate } = useRoute();
  return (
    <section id="contact" className="ed-contact sc-contact at-obsidian-grid" data-palette="blueBloom">
      <div className="ed-wrap">
        <div className="sc-contact-top">
          <div className="sc-contact-lead">
            <IndexLabel number="06">Contact</IndexLabel>
            <h2>Building something <em>ambitious?</em></h2>
            <a href={`mailto:${CONTACT.email}`} className="sc-email" data-cursor="Write">{CONTACT.email}</a>
          </div>
          <div className="sc-contact-card">
            <p className="sc-contact-card-kicker"><i aria-hidden="true" />Start a conversation</p>
            <p className="sc-contact-card-copy">
              I like the hard part: agents that have to be trusted, evals that have to be honest, and products that have to ship. If that sounds like your problem, write to me.
            </p>
            <div className="sc-contact-card-actions">
              <MagneticLink href={`mailto:${CONTACT.email}`} className="ed-contact-email">
                Email me<ArrowUpRight size={16} aria-hidden="true" />
              </MagneticLink>
              <div className="ed-socials">
                <a href={CONTACT.github} target="_blank" rel="noopener noreferrer">GitHub<ExternalLink size={13} /></a>
                <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<ExternalLink size={13} /></a>
              </div>
            </div>
          </div>
        </div>

        <div className="sc-footer-cols">
          <div>
            <h3>WORK</h3>
            <ul>
              <li><a href="#projects">Selected work</a></li>
              <li><a href="/work/">All projects</a></li>
              <li><a href="/work/saywhen/">saywhen</a></li>
              <li><a href="/work/hedwig/">Hedwig</a></li>
              <li><a href="/work/jarvis/">Jarvis</a></li>
            </ul>
          </div>
          <div>
            <h3>PLAYGROUND</h3>
            <ul>
              <li><a href="/playground/emet/">Emet terminal</a></li>
              <li><a href="/playground/explore/">Solar system</a></li>
              <li><a href="/playground/infinity/">Infinity stars</a></li>
              <li><a href="/playground/lineage-demo/">Data lineage</a></li>
            </ul>
          </div>
          <div>
            <h3>CONNECT</h3>
            <ul>
              <li><a href={`mailto:${CONTACT.email}`}>Email</a></li>
              <li><a href={CONTACT.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a></li>
              <li><a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></li>
            </ul>
          </div>
        </div>

        <footer className="ed-footer">
          <span>© {new Date().getFullYear()} Mohamed Ansar</span>
          <span>Designed and built by me, with AI as the pair programmer.</span>
          <button type="button" onClick={() => navigate("deck")} aria-label="Back to top">Back to top ↑</button>
        </footer>
      </div>
    </section>
  );
}
