import { useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Play } from "lucide-react";
import Count from "./Count";
import { LISTED_PROJECTS } from "../data/projects";
import { PROMPT, RUN } from "../film/actTwo/sets/hedwigRun";
import { STAGGER, fadeUp, maskReveal, tween } from "../lib/motion";
import "./HedwigPage.css";

/* Hedwig's own page. It tells the project with pictures first: the film
   in the hero, a real run of the model replayed as you scroll, the three
   model sizes drawn to scale, and the films at the end. One thing moves
   per screen, and everything settles to its final state under reduced
   motion. Every number and every story line here is real (see the hedwig
   repo: docs/LEARNINGS.md and docs/STORY_SHOWDOWN.md). */

const SHOT = (name) => `https://ansarbuilds.dev/hedwig/site/${name}`;
// The full films live on the hedwig repo's own Pages site, on this domain.
const FILM = "https://ansarbuilds.dev/hedwig/film/out/hedwig-demo.mp4";
const MOVIE = "https://ansarbuilds.dev/hedwig/movie/pip_and_the_lost_key.mp4";
const DEMO = "https://huggingface.co/spaces/ansarbuilds/hedwig-demo";
const CODE = "https://github.com/ansarbuilds/hedwig";
const WEIGHTS = "https://huggingface.co/ansarbuilds/hedwig-300m";
const GOLD = "#f5b841";

const STATS = [
  ["286.7M", "knobs in the biggest model, trained from random numbers"],
  ["$2.45", "the whole rented-GPU bill, for all three cloud runs"],
  ["98.3%", "of the time it picks the better story after taste training"],
  ["40/40", "pieces the browser version picks the same as PyTorch"],
];

// Area of each disc follows the knob count.
const SIZES = [
  { name: "Mac Hedwig", knobs: 13.8, cost: "$0.00", where: "MacBook Air M4", color: "#818cf8" },
  { name: "Cloud Hedwig", knobs: 97.6, cost: "$0.65", where: "1× A40, 66 min", color: "#5ee7ff" },
  { name: "Flagship Hedwig", knobs: 286.7, cost: "$1.70", where: "1× RTX 4090, 115 min", color: GOLD },
];
const disc = (knobs) => Math.sqrt(knobs / 286.7);

const STAGES = [
  ["Read", "Guess the next piece across 1.22 GB of stories, school pages and old novels."],
  ["Answer", "Learn to turn a request into a story, graded only on the reply."],
  ["Taste", "See two stories, learn which one people would like more."],
  ["Shrink", "Squeeze every knob into 4 bits. 27.8 MB becomes 7.9 MB."],
];

const SHOWDOWN = {
  prompt: "Write a story about a boy named Harry Potter.",
  rows: [
    ["13.8M", "Once upon a time, there was an adorable puppy named Harry.", "Forgot he was a boy."],
    ["97.6M", "Harry Potter was a happy, cheerful boy.", "Kept the name and the boy."],
    ["286.7M", "Once upon a time, there was a boy named Harry Potter. He was three years old and very brave.", "Kept all of it, and gave him a story."],
  ],
};

const LESSONS = [
  ["Change one thing at a time.", "Twice an \"improvement\" made the Mac slower or worse. Only the written-down score showed it."],
  ["A rising score can be a lie.", "Reward hacking showed up at 14 million knobs. Better numbers, broken stories."],
  ["Reading beats size.", "The 286.7M read about 0.7 pieces per knob, and its grammar edits trail the better-read 97.6M."],
  ["Compare stories, not scores.", "Three dictionaries make three scales. Reading the stories side by side is the fair test."],
];

function Kicker({ children }) {
  return <p className="hw-kicker">{children}</p>;
}

function Reveal({ children, className = "", i = 0, as = "div" }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={fadeUp} custom={i} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "0px 0px -12% 0px" }}>
      {children}
    </Tag>
  );
}

/* ---------- 1. Hero: the film's last shot, looping, under the title ---------- */
function Hero({ reduced }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0]);
  return (
    <header ref={ref} className="hw-hero">
      <motion.div className="hw-hero-media" style={{ y: lift }}>
        {reduced
          ? <img src={SHOT("hero-poster.jpg")} alt="" />
          : <video src={SHOT("hero-loop.mp4")} poster={SHOT("hero-poster.jpg")} autoPlay muted loop playsInline aria-hidden="true" />}
      </motion.div>
      <div className="hw-hero-shade" />
      <motion.div className="hw-hero-copy" style={{ opacity: fade }} initial="hidden" animate="shown">
        <a href="#card-hedwig" className="hw-back"><ArrowLeft size={13} /> All projects</a>
        <motion.p className="hw-kicker" variants={fadeUp} custom={0}>Open source · built from scratch · runs in your browser</motion.p>
        <h1 className="hw-title" aria-label="Hedwig">
          {"Hedwig".split("").map((ch, i) => (
            <span key={i} className="hw-mask" aria-hidden="true">
              <motion.span className="inline-block" variants={maskReveal} custom={i + 1}>{ch}</motion.span>
            </span>
          ))}
        </h1>
        <motion.p className="hw-lede" variants={fadeUp} custom={3}>
          A ChatGPT-style storyteller I built in plain PyTorch. It grew from <b>zero</b> to <b>286.7 million</b> knobs for <b>$2.45</b>.
        </motion.p>
        <motion.div className="hw-ctas" variants={fadeUp} custom={4}>
          <a className="hw-btn hw-btn-gold" href={DEMO} target="_blank" rel="noopener noreferrer">Try it live <ArrowUpRight size={15} /></a>
          <a className="hw-btn" href="#hw-films"><Play size={14} /> Watch the film</a>
          <a className="hw-btn" href={CODE} target="_blank" rel="noopener noreferrer">Code <ArrowUpRight size={15} /></a>
        </motion.div>
      </motion.div>
      <div className="hw-scroll-cue" aria-hidden="true"><span /></div>
    </header>
  );
}

/* ---------- 2. Watch it think: a real run, replayed by scroll ---------- */
function Think({ reduced }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [n, setN] = useState(reduced ? RUN.length : 1);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced) return;
    const next = Math.max(1, Math.min(RUN.length, Math.round(p * 1.15 * RUN.length)));
    setN((prev) => (prev === next ? prev : next));
  });
  const [piece, top] = RUN[n - 1];
  return (
    <section ref={ref} className={reduced ? "hw-think hw-think-still" : "hw-think"} aria-labelledby="hw-think-h">
      <div className="hw-think-stick">
        <div className="hw-wrap hw-think-grid">
          <div>
            <Kicker>A real run · 13.8M model</Kicker>
            <h2 id="hw-think-h" className="hw-h2">Watch it think.</h2>
            <p className="hw-prompt"><span>You</span>{PROMPT}</p>
            <p className="hw-story" aria-label={RUN.map((r) => r[0]).join("")}>
              <span aria-hidden="true">
                {RUN.slice(0, n).map(([p], i) => (
                  <span key={i} className={i === n - 1 ? "hw-now" : undefined}>{p}</span>
                ))}
                {!reduced && n < RUN.length && <span className="hw-caret">▍</span>}
              </span>
            </p>
          </div>
          <div className="hw-xray" aria-hidden="true">
            <p className="hw-xray-h">🔬 What it was weighing for “<b>{piece.trim() || "↵"}</b>”</p>
            {top.map(([w, pct], i) => (
              <div key={`${n}-${i}`} className="hw-bar">
                <span className={w === piece ? "hw-bar-w hw-bar-pick" : "hw-bar-w"}>{JSON.stringify(w).slice(1, -1)}</span>
                <span className="hw-bar-track"><motion.span className="hw-bar-fill" style={{ background: i === 0 ? GOLD : "#818cf8" }}
                  initial={{ scaleX: reduced ? pct / 100 : 0 }} animate={{ scaleX: Math.max(pct, 1) / 100 }} transition={tween("base")} /></span>
                <span className="hw-bar-p">{pct}%</span>
              </div>
            ))}
            <p className="hw-note">It doesn't always take the top pick. A little randomness keeps stories from repeating.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Numbers ---------- */
function Numbers() {
  return (
    <section className="hw-wrap hw-section" aria-label="Key numbers">
      <dl className="hw-stats">
        {STATS.map(([v, label], i) => (
          <Reveal key={v} i={i} className="hw-stat">
            <dt className="hw-stat-v"><Count value={v} /></dt>
            <dd>{label}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

/* ---------- 4. Three sizes, drawn to scale ---------- */
function Scale({ reduced }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  return (
    <section ref={ref} className="hw-wrap hw-section" aria-labelledby="hw-scale-h">
      <Reveal><Kicker>Three generations, six days</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-scale-h" className="hw-h2">From a laptop to a <em>$1.70</em> GPU.</h2></Reveal>
      <div className="hw-discs">
        {SIZES.map((s, i) => (
          <div key={s.name} className="hw-disc-col">
            <div className="hw-disc-box">
              <motion.div className="hw-disc" style={{ width: `${disc(s.knobs) * 100}%`, "--c": s.color }}
                initial={{ scale: reduced ? 1 : 0 }} animate={seen ? { scale: 1 } : {}} transition={tween("scene", "out", i * STAGGER.loose * 3)} />
            </div>
            <p className="hw-disc-n" style={{ color: s.color }}>{s.knobs}M</p>
            <p className="hw-disc-name">{s.name}</p>
            <p className="hw-disc-meta">{s.where} · <b>{s.cost}</b></p>
          </div>
        ))}
      </div>
      <Reveal className="hw-scale-note">For scale: GPT-2 small (2019) is 124M knobs. GPT-3 is 175,000M, a disc about 25 times wider than the gold one.</Reveal>
    </section>
  );
}

/* ---------- 5. How it learns: the line draws as you scroll ---------- */
function Stages({ reduced }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const draw = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : 0, 1]);
  return (
    <section ref={ref} className="hw-wrap hw-section" aria-labelledby="hw-stages-h">
      <Reveal><Kicker>The same three stages as ChatGPT, plus one</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-stages-h" className="hw-h2">How it learns.</h2></Reveal>
      <ol className="hw-stages">
        <motion.span className="hw-stages-line" style={{ scaleX: draw }} aria-hidden="true" />
        {STAGES.map(([name, text], i) => (
          <Reveal as="li" key={name} i={i} className="hw-stage">
            <span className="hw-stage-n">{String(i + 1).padStart(2, "0")}</span>
            <h3>{name}</h3>
            <p>{text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* ---------- 6. The loophole ---------- */
function Loophole() {
  const bad = "Lily loves Lily's key. Lily does Lily's mom's idea...";
  return (
    <section className="hw-wrap hw-section" aria-labelledby="hw-hack-h">
      <Reveal><Kicker>The best bug</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-hack-h" className="hw-h2">It learned to cheat.</h2></Reveal>
      <Reveal i={2} as="p" className="hw-body">Taste training rewards the gap between a liked and a disliked story. By step 300, Hedwig found that cramming <q>Lily's</q> into every third word widened the gap. The score went up. The stories fell apart.</Reveal>
      <div className="hw-hack">
        <Reveal i={0} className="hw-page hw-page-bad">
          <span className="hw-tag hw-tag-bad">Step 300 · score up</span>
          <p>{bad.split(/(Lily's)/).map((t, i) => (t === "Lily's" ? <mark key={i}>{t}</mark> : t))}</p>
        </Reveal>
        <Reveal i={1} className="hw-page">
          <span className="hw-tag">With a fluency anchor</span>
          <p>Once upon a time, there was a wise owl named Hoot. He lived in the forest with his friends. One day, while he was flying by, he saw something shiny on the ground. It was a key!</p>
        </Reveal>
      </div>
      <Reveal className="hw-body hw-muted">The fix: keep the model close to how it wrote before taste training. The cheat closed and the win rate still climbed to 91.7%.</Reveal>
    </section>
  );
}

/* ---------- 7. Same prompt, three sizes ---------- */
function Showdown() {
  return (
    <section className="hw-wrap hw-section" aria-labelledby="hw-show-h">
      <Reveal><Kicker>One of 12 fixed prompts · same seed</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-show-h" className="hw-h2">Bigger models keep the request.</h2></Reveal>
      <Reveal i={2} as="p" className="hw-prompt"><span>You</span>{SHOWDOWN.prompt}</Reveal>
      <div className="hw-show">
        {SHOWDOWN.rows.map(([size, line, verdict], i) => (
          <Reveal key={size} i={i} className="hw-page">
            <span className="hw-tag" style={{ color: SIZES[i].color }}>{size}</span>
            <p>{line}</p>
            <span className="hw-verdict">{verdict}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- 8. Films ---------- */
function Film({ src, poster, title, meta }) {
  return (
    <figure className="hw-film">
      <div className="hw-screen"><video src={src} poster={poster} controls preload="none" playsInline /></div>
      <figcaption><b>{title}</b> {meta}</figcaption>
    </figure>
  );
}
function Films() {
  return (
    <section id="hw-films" className="hw-wrap hw-section" aria-labelledby="hw-films-h">
      <Reveal><Kicker>Two films</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-films-h" className="hw-h2">Then it wrote a movie.</h2></Reveal>
      <div className="hw-films">
        <Reveal i={0}><Film src={FILM} poster={SHOT("film-poster.jpg")} title="The launch film." meta="60 seconds, made in code with Remotion." /></Reveal>
        <Reveal i={1}><Film src={MOVIE} poster={SHOT("pip-poster.jpg")} title="Pip and the Lost Key." meta="84 seconds. The story is word for word from the 286.7M model." /></Reveal>
      </div>
    </section>
  );
}

/* ---------- 9. Lessons + links ---------- */
function Lessons() {
  return (
    <section className="hw-wrap hw-section" aria-labelledby="hw-lessons-h">
      <Reveal><Kicker>What I took from it</Kicker></Reveal>
      <h2 id="hw-lessons-h" className="sr-only">What I learned</h2>
      <ul className="hw-lessons">
        {LESSONS.map(([head, body], i) => (
          <Reveal as="li" key={head} i={i}>
            <p className="hw-lesson-h">{head}</p>
            <p>{body}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export default function HedwigPage() {
  const reduced = useReducedMotion();
  const li = LISTED_PROJECTS.findIndex((p) => p.slug === "hedwig");
  const next = LISTED_PROJECTS[(li + 1) % LISTED_PROJECTS.length];
  return (
    <div className="hw">
      <Hero reduced={reduced} />
      <Think reduced={reduced} />
      <Numbers />
      <Scale reduced={reduced} />
      <Stages reduced={reduced} />
      <Loophole />
      <Showdown />
      <Films />
      <Lessons />
      <section className="hw-wrap hw-end">
        <Reveal as="p" className="hw-end-h">Ask it for a story.</Reveal>
        <Reveal i={1} className="hw-ctas hw-ctas-center">
          <a className="hw-btn hw-btn-gold" href={DEMO} target="_blank" rel="noopener noreferrer">Try the live demo <ArrowUpRight size={15} /></a>
          <a className="hw-btn" href="/p/hedwig/">The six-act case study</a>
          <a className="hw-btn" href={CODE} target="_blank" rel="noopener noreferrer">Code on GitHub <ArrowUpRight size={15} /></a>
          <a className="hw-btn" href={WEIGHTS} target="_blank" rel="noopener noreferrer">Weights <ArrowUpRight size={15} /></a>
        </Reveal>
        {next && (
          <a className="hw-next" href={`/work/${next.slug}/`}>
            <span>Next project</span>
            <b>{next.title}</b>
          </a>
        )}
      </section>
    </div>
  );
}
