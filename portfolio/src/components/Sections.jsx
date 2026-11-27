import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, ExternalLink, Play } from "lucide-react";
import HedwigTrace from "./HedwigTrace";
import DitherField from "./DitherField";
import WorkStage from "./WorkStage";
import { CODE, CONTACT, HERO, RECEIPTS } from "../data/content";
import { PROJECT_INDEX, getProject } from "../data/projectIndex";
import { CAPABILITIES, MORE_WORK } from "../data/showcase";
import { ARCHIVE, ARCHIVE_TOTAL } from "../data/archive";
import { EASE, STAGGER, tween } from "../lib/motion";
import { INTRO_SESSION_KEY, filmEnabled, watchFilm } from "../lib/intro";
import { media } from "../lib/media";
import MagneticLink from "./Magnetic";
import { useRoute } from "../appContexts";
import "../editorial.css";
import "../showcase.css";
import "../quiet-print.css";

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

const fill = (text) => text.replace("REPOS", CODE.repos);
const RECEIPT_VALUES = RECEIPTS.map((item) => ({
  ...item,
  value: item.value === "PROJECTS" ? String(PROJECT_INDEX.length) : item.value === "LINES" ? CODE.total.toLocaleString("en-US") : item.value,
  label: fill(item.label),
}));

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
        <dl className="sc-receipts">
          {RECEIPT_VALUES.map((item) => (
            <div key={item.label}>
              <dt>{item.value}</dt>
              <dd>{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );

  return (
    <div className="sc-open">
      <section ref={heroRef} id="hero" aria-labelledby="hero-name" className="sc-hero" data-palette="lumen">
        <div className="ed-wrap sc-hero-grid-layout">
          <div className="sc-hero-inner">
            <motion.h1 id="hero-name" className="sc-hero-kicker" {...appear(0)}>
              <i aria-hidden="true" />
              <span>Mohamed Ansar</span>
              <span className="sc-hero-kicker-meta" aria-hidden="true">· {HERO.eyebrow} · {CODE.asOf}</span>
            </motion.h1>
            <motion.p ref={nameRef} className="sc-hero-name" style={{ x: nameX, y: nameY, scale: nameScale }}>
              <span className="sc-name-line"><motion.span {...line(0)}>{HERO.claim[0]}</motion.span></span>
              <span className="sc-name-line"><motion.span className="is-accent" {...line(1)}>{HERO.claim[1]}</motion.span></span>
            </motion.p>
            <motion.p className="sc-hero-line" {...appear(1)}>
              I also build agents that run on their own, test other people's AI claims, and ship native apps. <em className="sc-nowrap">{PROJECT_INDEX.length} projects below.</em>
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
            <HedwigTrace />
          </motion.div>
        </div>

      </section>
      {brief}
    </div>
  );
}

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
            <h2>Six projects, <em>in depth.</em></h2>
          </div>
          <div className="ed-heading-aside">
            <p>Pick a tab. Each has its headline number, a demo or film, and the full write-up.</p>
          </div>
        </Enter>
      </div>
      <div className="qp-plate-band">
        <DitherField seed={2.4} />
        <div className="ed-wrap">
          <div className="qp-plate"><WorkStage /></div>
        </div>
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
            <Enter className="sc-caps-panel">
              <IndexLabel number="03">What I bring</IndexLabel>
              <h2>What the work <br /><em>covers.</em></h2>
              <p className="sc-caps-aside">Three kinds of work, each linked to the projects that show it.</p>
            </Enter>
            <div className="sc-cap-rows">
              {CAPABILITIES.map((cap, i) => (
                <Enter key={cap.id} index={i} className="sc-cap-row">
                  <div className="sc-cap-row-stat">
                    <p className="sc-cap-count">{cap.count}</p>
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
          {item.metric && <p className="sc-card-metric"><strong>{item.metric}</strong><span>{item.unit}</span></p>}
          <p className="sc-card-line">{item.line}</p>
        </div>
      </a>
    </Enter>
  );
}


export function MoreWorkSection() {
  return (
    <section id="more" className="sc-more ed-light ed-section" data-palette="lumora">
      <div className="ed-wrap">
        <Enter className="ed-section-heading">
          <div>
            <IndexLabel number="04">More shipped work</IndexLabel>
            <h2>Four more, <br /><em>then everything.</em></h2>
          </div>
          <p className="ed-heading-aside">Two studies, an agent skill and an app, then the full index below.</p>
        </Enter>
        <div className="sc-card-grid">
          {MORE_WORK.map((item, i) => <WorkCard key={item.slug} item={item} index={i} />)}
        </div>
        <div className="ix-preview" aria-labelledby="ix-preview-h">
          <div className="ix-preview-head">
            <h3 id="ix-preview-h">The full index: {ARCHIVE_TOTAL} projects</h3>
            <a href="/work/">Open the index<ArrowUpRight size={13} aria-hidden="true" /></a>
          </div>
          <dl>
            {ARCHIVE.map((group) => (
              <div key={group.id}>
                <dt>{group.label}<span className="ix-count">{group.projects.length}</span></dt>
                <dd>
                  {group.projects.map((p, i) => (
                    <span key={p.slug}>{i > 0 && " · "}<a href={`/work/${p.slug}/`}>{p.title}</a></span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return <PlainContact />;
}

/* Deep Slate-Obsidian colophon & contact section */
function PlainContact() {
  const { navigate } = useRoute();
  return (
    <section id="contact" className="ed-contact sc-contact" data-palette="blueBloom">
      <div className="qp-band-slim"><DitherField seed={5.1} density={0.36} /></div>
      <div className="ed-wrap">
        <div className="sc-contact-top">
          <div className="sc-contact-lead">
            <IndexLabel number="05">Contact</IndexLabel>
            <h2>Write <em>to me.</em></h2>
            <a href={`mailto:${CONTACT.email}`} className="sc-email" data-cursor="Write">{CONTACT.email}</a>
          </div>
          <div className="sc-contact-card">
            <p className="sc-contact-card-kicker"><i aria-hidden="true" />Email</p>
            <p className="sc-contact-card-copy">
              A question about a project, a study you think I got wrong, or something you are building with AI. I read everything.
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
