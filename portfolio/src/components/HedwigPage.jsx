import { useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Play } from "lucide-react";
import Count from "./Count";
import { LISTED_PROJECTS } from "../data/projects";
import { PROMPT, RUN } from "../film/actTwo/sets/hedwigRun";
import { STAGGER, fadeUp, maskReveal, tween } from "../lib/motion";
import "./HedwigPage.css";

/* Hedwig's own page. It tells the full journey: why I built my own LLM
   from scratch, what ran on the MacBook Air ($0), why the Mac hit a compute
   and vocabulary wall, why rented GPUs ran 26x faster ($2.45 total), how
   much the model improved across 13.8M / 97.6M / 286.7M, and how Hedwig
   compares to GPT and Claude clusters. No em dashes, plain words, and every
   number comes from docs/LEARNINGS.md and docs/STORY_SHOWDOWN.md. */

const SHOT = (name) => `https://ansarbuilds.dev/hedwig/site/${name}`;
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

const SIZES = [
  { name: "Mac Hedwig", knobs: 13.8, cost: "$0.00", where: "MacBook Air M4", color: "#818cf8" },
  { name: "Cloud Hedwig", knobs: 97.6, cost: "$0.65", where: "1× A40, 66 min", color: "#5ee7ff" },
  { name: "Flagship Hedwig", knobs: 286.7, cost: "$1.70", where: "1× RTX 4090, 115 min", color: GOLD },
];
const disc = (knobs) => Math.sqrt(knobs / 286.7);

const STAGES = [
  ["Read", "Guess the next piece across 1.22 GB of stories, school pages and old novels."],
  ["Answer", "Learn to turn a request into a story, graded only on the reply (-100 prompt mask)."],
  ["Taste", "See two stories, learn which one people like more without gaming the score."],
  ["Shrink", "Squeeze every knob into 4 bits. 27.8 MB becomes 7.9 MB with almost zero quality loss."],
];

const FLOW_NODES = [
  ["01 · Data & BPE", "From-scratch word pieces", "TinyStories, FineWeb-Edu and 10 Gutenberg novels turned into 4k, 8k or 16k BPE pieces."],
  ["02 · Modern Transformer", "Pure PyTorch engine", "RoPE, RMSNorm, SwiGLU, bf16 autocast and SDPA written by hand, no Trainer."],
  ["03 · Chat + Taste", "SFT & Anchored DPO", "Prompt loss masking plus a fluency anchor that stops the 'Lily's' reward hack."],
  ["04 · Run Anywhere", "4-bit & Brain X-Ray", "KV cache doubles speed; runs offline on Mac, iPhone Core ML and in any browser tab."],
];

const LAB_ITEMS = [
  "MoE 8→2 experts (26.2M / 11.6M active)",
  "Baby Hedwig distillation (3.4M, 6.8 MB)",
  "Apple MLX 6× faster training step",
  "SSD layer streaming (52.9 → 18.8 MB)",
  "iPhone Core ML 30/30 exact match",
  "French Hedwig (2.56M, Dumas + Verne)",
];

const SHOWDOWNS = [
  {
    tab: "Harry Potter",
    prompt: "Write a story about a boy named Harry Potter.",
    rows: [
      ["13.8M (Mac · $0)", "Once upon a time, there was an adorable puppy named Harry. Harry asked Potus, \"What's inside?\"", "Chopped 'Potter' into fragments and made him a puppy.", "no"],
      ["97.6M (A40 · $0.65)", "Harry Potter was a happy, cheerful boy. He loved to play outside and explore the world around him.", "Kept 'Harry Potter' and 'Harry' as a boy throughout.", "ok"],
      ["286.7M (4090 · $1.70)", "Once upon a time, there was a boy named Harry Potter. He was three years old and very brave.", "Kept the name, age and plot intact.", "ok"],
    ],
  },
  {
    tab: "Lily & the frog",
    prompt: "Tell me a story where Lily shares her red umbrella with a small frog.",
    rows: [
      ["13.8M (Mac · $0)", "At the park, Lily saw a small hole in the sidewalk. She picked up a wet umbrella and dipped it into the hole.", "Forgot the frog completely.", "no"],
      ["97.6M (A40 · $0.65)", "Lily's umbrella got wet and she didn't have a green one. Her friends helped her get the umbrella over.", "Also forgot the frog.", "no"],
      ["286.7M (4090 · $1.70)", "One day, she went for a walk in the forest and found a small frog... A big frog grabbed Lily's red umbrella!", "Lily, the small frog and the red umbrella, all three.", "ok"],
    ],
  },
  {
    tab: "Treehouse",
    prompt: "Write a short story about two best friends who build a treehouse together.",
    rows: [
      ["13.8M (Mac · $0)", "One day, a little girl named Lucy found a big tree. She started to build the tallest house with her blocks.", "One girl, no treehouse.", "no"],
      ["97.6M (A40 · $0.65)", "Once there was a boy named Tom... \"What are you doing, Jack?\" asked Jack.", "Built a treehouse, then Jack talked to himself.", "mid"],
      ["286.7M (4090 · $1.70)", "Once upon a time, there were two best friends. Their names were Bob and Sue... thunder and lightning.", "Two distinct friends start to finish.", "ok"],
    ],
  },
  {
    tab: "Grammar edit",
    prompt: "Improve the grammar of this text: I goes to the office yesterday and send the report to my manager.",
    rows: [
      ["13.8M (Mac · $0)", "Once upon a time, there was an office. It was very big and had many rooms...", "Ignored edit mode and wrote a bedtime story.", "no"],
      ["97.6M (A40 · $0.65)", "I go to the office yesterday, and send the report to my manager.", "Switched to edit mode; fixed 'goes' (1.7 tok/knob).", "mid"],
      ["286.7M (4090 · $1.70)", "I goes to the office yesterday and send the report to my manager.", "Under-read (0.7 tok/knob) missed the grammar fix.", "no"],
    ],
  },
];

const FRONTIER_ROWS = [
  { name: "Mac Hedwig", knobs: "13.8M", gpus: "1× MacBook Air M4", tokens: "~125M", ratio: "~9.0", cost: "$0.00", pct: 48, style: "slow" },
  { name: "Cloud Hedwig", knobs: "97.6M", gpus: "1× NVIDIA A40 (66m)", tokens: "~164M", ratio: "~1.7", cost: "$0.65", pct: 56, style: "fast" },
  { name: "Flagship Hedwig", knobs: "286.7M", gpus: "1× NVIDIA RTX 4090 (115m)", tokens: "~205M", ratio: "~0.7", cost: "$1.70", pct: 60, style: "gold" },
  { name: "GPT-2 Small (2019)", knobs: "124M", gpus: "32× Cloud TPU v3", tokens: "~10B", ratio: "~80", cost: "~$1k-$5k", pct: 57, style: "them" },
  { name: "GPT-3 (2020)", knobs: "175B", gpus: "~1k-10k× NVIDIA V100", tokens: "~300B", ratio: "~1.7", cost: "~$4.6M", pct: 84, style: "them" },
  { name: "Llama 3 (2024)", knobs: "405B", gpus: "16,384× NVIDIA H100", tokens: "15.6T", ratio: "~38.5", cost: "~$50M+", pct: 90, style: "them" },
  { name: "GPT-4/5 · Claude Opus", knobs: "1T+ (est.)", gpus: "10k-100k+ H100 / B200", tokens: "10T-20T+", ratio: "~20+ & RL", cost: "$50M-$500M+", pct: 100, style: "them" },
];

const LESSONS = [
  ["Change one thing at a time.", "Twice an \"improvement\" made the Mac slower or worse: 512-BPE overfit Shakespeare after step 750, and RMSNorm ran 30% slower on Apple MPS than LayerNorm. Only writing down every score caught it."],
  ["A rising score can be a lie.", "Reward hacking showed up at 14 million knobs. Pure DPO stuffed 'Lily's' into every third word to raise the score while breaking stories. A Llama-3-style fluency anchor closed the cheat."],
  ["Reading beats parameter count.", "The 286.7M model read about 0.7 pieces per knob to stay under $2, and its grammar edits trail the better-read 97.6M (~1.7 pieces per knob). That is the Chinchilla law in action."],
  ["Compare stories, not scores.", "Three dictionaries (4k, 8k, 16k) make three different quiz scales. Reading the stories side by side on fixed prompts is the only fair test."],
  ["Dry-run locally before renting.", "A 2-step Mac rehearsal (--dry-run, 92 seconds) caught path and resume bugs for $0, so every rented GPU minute went straight into training."],
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

/* ---------- 1. Hero ---------- */
function SnowyOwl() {
  return (
    <svg className="hw-snowy" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="hwSnowyBody" cx="58%" cy="24%" r="76%">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="68%" stopColor="#f6f2ea" /><stop offset="100%" stopColor="#dcd4c5" />
        </radialGradient>
        <linearGradient id="hwSnowyWing" x1="82%" y1="12%" x2="10%" y2="96%">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="60%" stopColor="#f2ede3" /><stop offset="100%" stopColor="#cec5b5" />
        </linearGradient>
        <radialGradient id="hwSnowyEye" cx="38%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#ffd75e" /><stop offset="55%" stopColor="#db8700" /><stop offset="100%" stopColor="#693000" />
        </radialGradient>
      </defs>
      <path d="M-38 78 Q-10 66 26 70 Q54 73 74 91 L66 97 Q28 84 -8 86 Q-28 89 -42 95 Z" fill="#1b243c" stroke="#314169" strokeWidth="1.4" />
      <path d="M-38 78 Q-18 72 -4 76 L-8 87 Q-24 88 -40 94 Z" fill="#3a5280" opacity=".75" />
      <g transform="rotate(6)">
        <path d="M-36 52 L-62 96 Q-55 98 -48 92 L-24 58 Z M-26 56 L-50 98 Q-43 100 -36 93 L-16 62 Z" fill="#e6dfd0" stroke="#c3baa8" strokeWidth="1" />
        <path d="M-50 78 q4 2 2 6 q-4 -2 -2 -6 Z M-40 82 q4 2 2 6 q-4 -2 -2 -6 Z" fill="#4e341b" opacity=".78" />
      </g>
      <path d="M-14 -50 C-2 -70 30 -70 42 -48 C48 -36 47 -22 46 -6 C48 24 34 56 -6 66 C-34 72 -52 46 -40 14 C-32 -8 -24 -34 -14 -50 Z" fill="url(#hwSnowyBody)" stroke="#9a9182" strokeWidth="1.35" />
      <path d="M-10 48 C-14 66 -2 76 14 74 C24 73 28 60 22 48 Z" fill="#f7f4ec" stroke="#ddd4c4" strokeWidth="1" />
      <path d="M2 72 Q-2 80 4 82 M10 73 Q10 82 16 82 M18 71 Q22 79 26 78" stroke="#22252e" strokeWidth="3.1" strokeLinecap="round" fill="none" />
      <g className="hw-wing">
        <path d="M8 -14 C26 4 12 36 -18 62 C-46 86 -72 98 -82 96 C-80 76 -64 42 -42 16 C-22 -8 -4 -22 8 -14 Z" fill="url(#hwSnowyWing)" stroke="#d5ccbc" strokeWidth="1.1" />
        <path d="M-24 26 Q-52 58 -76 92 M-14 34 Q-40 62 -64 88" stroke="#c8bfb0" strokeWidth="1" fill="none" opacity=".7" />
        <g fill="#4e341b" opacity=".82">
          <path d="M-6 12 l5 1 l-3 4 Z" /><path d="M6 17 l4 1 l-2 4 Z" /><path d="M-18 22 l5 1 l-3 4 Z" />
          <path d="M-4 26 l5 1 l-3 4 Z" /><path d="M9 28 l4 1 l-2 4 Z" /><path d="M-28 32 l5 2 l-3 4 Z" />
          <path d="M-14 35 l5 1 l-3 4 Z" /><path d="M1 37 l4 1 l-2 4 Z" /><path d="M-36 42 l6 2 l-4 4 Z" />
          <path d="M-22 45 l5 1 l-3 4 Z" /><path d="M-7 47 l4 1 l-2 4 Z" /><path d="M-44 52 l6 2 l-4 4 Z" />
          <path d="M-30 55 l5 1 l-3 4 Z" /><path d="M-16 57 l4 1 l-2 4 Z" /><path d="M-50 62 l5 2 l-3 4 Z" />
          <path d="M-37 64 l5 1 l-3 4 Z" /><path d="M-56 72 l5 2 l-3 4 Z" /><path d="M-43 74 l4 1 l-2 4 Z" />
          <path d="M-60 81 l4 2 l-2 3 Z" />
        </g>
      </g>
      <path d="M-6 -28 Q14 -16 34 -28 M-10 -46 Q14 -56 38 -46" stroke="#e6decb" strokeWidth="1.1" fill="none" opacity=".45" />
      <g transform="rotate(10 2 -40)">
        <ellipse cx="2" cy="-40" rx="7.6" ry="6.8" fill="url(#hwSnowyEye)" stroke="#241b11" strokeWidth="1.4" />
        <circle cx="2" cy="-40" r="3.4" fill="#0c0905" /><circle cx=".5" cy="-41.8" r="1.4" fill="#fff" />
        <ellipse className="hw-lid" cx="2" cy="-40" rx="8.2" ry="7.4" fill="#efe8d8" />
        <path d="M-6 -41 Q2 -48.5 10 -41" stroke="#2a2015" strokeWidth="1.9" fill="none" opacity=".78" />
      </g>
      <g transform="rotate(-10 24 -40)">
        <ellipse cx="24" cy="-40" rx="7.6" ry="6.8" fill="url(#hwSnowyEye)" stroke="#241b11" strokeWidth="1.4" />
        <circle cx="24" cy="-40" r="3.4" fill="#0c0905" /><circle cx="22.5" cy="-41.8" r="1.4" fill="#fff" />
        <ellipse className="hw-lid" cx="24" cy="-40" rx="8.2" ry="7.4" fill="#efe8d8" />
        <path d="M16 -41 Q24 -48.5 32 -41" stroke="#2a2015" strokeWidth="1.9" fill="none" opacity=".78" />
      </g>
      <path d="M10 -34 Q13 -37 16 -34 L14 -24 Q13 -22 11 -24 Z" fill="#23252b" stroke="#0c0d10" strokeWidth="1" />
      <path d="M6 -32 Q10 -30 11 -28 M20 -32 Q16 -30 15 -28" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

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
        <div className="hw-hero-row">
          <div>
            <motion.p className="hw-kicker" variants={fadeUp} custom={0}>My try at building an LLM from scratch · pure PyTorch</motion.p>
            <h1 className="hw-title" aria-label="Hedwig">
              {"Hedwig".split("").map((ch, i) => (
                <span key={i} className="hw-mask" aria-hidden="true">
                  <motion.span className="inline-block" variants={maskReveal} custom={i + 1}>{ch}</motion.span>
                </span>
              ))}
            </h1>
            <motion.p className="hw-lede" variants={fadeUp} custom={3}>
              I built a ChatGPT-style model from scratch on a MacBook Air, hit the laptop wall, and scaled to <b>286.7 million</b> knobs on rented GPUs for <b>$2.45</b>.
            </motion.p>
            <motion.div className="hw-ctas" variants={fadeUp} custom={4}>
              <a className="hw-btn hw-btn-gold" href={DEMO} target="_blank" rel="noopener noreferrer">Try it live <ArrowUpRight size={15} /></a>
              <a className="hw-btn" href="#hw-films"><Play size={14} /> Watch the film</a>
              <a className="hw-btn" href={CODE} target="_blank" rel="noopener noreferrer">Code <ArrowUpRight size={15} /></a>
            </motion.div>
          </div>
          <motion.div variants={fadeUp} custom={2}>
            <SnowyOwl />
          </motion.div>
        </div>
      </motion.div>
      <div className="hw-scroll-cue" aria-hidden="true"><span /></div>
    </header>
  );
}

/* ---------- 2. Watch it think ---------- */
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
            <p className="hw-story">
              {/* The whole story for screen readers; the typing is for the eye. */}
              <span className="sr-only">{RUN.map((r) => r[0]).join("")}</span>
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

/* ---------- 4. What I built on Mac + Architecture Flow ---------- */
function Stages({ reduced }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const draw = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : 0, 1]);
  return (
    <section ref={ref} className="hw-wrap hw-section" aria-labelledby="hw-stages-h">
      <Reveal><Kicker>What I did on my Mac · $0.00</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-stages-h" className="hw-h2">All three ChatGPT stages, <em>on one laptop.</em></h2></Reveal>
      <Reveal i={2} as="p" className="hw-body">I started at 4.8M letter-by-letter Shakespeare, built a 4,096-piece BPE tokenizer from scratch, upgraded to Llama-style parts (RoPE, RMSNorm, SwiGLU, bf16, SDPA), and ran all three post-training stages plus six $0 lab experiments on a 16 GB MacBook Air M4.</Reveal>
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
      <div className="hw-flow">
        {FLOW_NODES.map(([tag, title, body], i) => (
          <Reveal key={tag} i={i} className="hw-fnode">
            <small>{tag}</small>
            <h3>{title}</h3>
            <p>{body}</p>
          </Reveal>
        ))}
      </div>
      <Reveal className="hw-labchips">
        {LAB_ITEMS.map((item) => <span key={item}>{item}</span>)}
      </Reveal>
    </section>
  );
}

/* ---------- 5. The loophole ---------- */
function Loophole() {
  const bad = "Lily loves Lily's key. Lily does Lily's mom's idea...";
  return (
    <section className="hw-wrap hw-section" aria-labelledby="hw-hack-h">
      <Reveal><Kicker>The best bug on the Mac</Kicker></Reveal>
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
      <Reveal className="hw-body hw-muted">The fix: keep the model close to how it wrote before taste training. The cheat closed and the win rate climbed to 92.5% peak.</Reveal>
    </section>
  );
}

/* ---------- 6. Why Mac wasn't enough & Why rented GPUs are 26x faster ---------- */
function WhyGpu({ reduced }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  return (
    <section ref={ref} className="hw-wrap hw-section" aria-labelledby="hw-gpu-h">
      <Reveal><Kicker>Why I rented GPUs</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-gpu-h" className="hw-h2">Why the Mac wasn't enough, and why GPUs run <em>26× faster.</em></h2></Reveal>
      <Reveal i={2} as="p" className="hw-body">A fanless MacBook Air M4 took ~20 hours for a single full-shelf read and throttled from 66s to 110s per 250 steps as it heated up. Training a 100M+ brain locally would take weeks. I rehearsed a 2-step dry run on the Mac first (92s), then moved to RunPod.</Reveal>

      <div className="hw-panel">
        <h3>Same 50 MB lesson (13.8M knobs, 3,000 steps)</h3>
        <div className="hw-race">
          <div className="hw-racer">
            <div className="hw-racer-lbl"><b>MacBook Air M4 ($0)</b><small>8-core GPU · fanless throttling</small></div>
            <div className="hw-rtrack">
              <motion.div className="hw-rfill slow" initial={{ scaleX: reduced ? 1 : 0 }} animate={seen ? { scaleX: 1 } : {}} transition={tween("scene", "out", 0.1)}>
                ~59 min (3,540 s)
              </motion.div>
            </div>
          </div>
          <div className="hw-racer">
            <div className="hw-racer-lbl"><b>Rented RTX A5000 ($0.10)</b><small>1× GPU · $0.28/hr · 26× faster</small></div>
            <div className="hw-rtrack">
              <motion.div className="hw-rfill fast" style={{ width: "16%", minWidth: 112 }} initial={{ scaleX: reduced ? 1 : 0 }} animate={seen ? { scaleX: 1 } : {}} transition={tween("scene", "out", 0.25)}>
                135 s
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="hw-cards2">
        <Reveal className="hw-card">
          <Kicker>Inside the GPU speed jump</Kicker>
          <h3>Tensor Cores + FlashAttention + VRAM</h3>
          <p>NVIDIA data-center GPUs pack thousands of Tensor Cores dedicated to bf16 matrix math, run fused CUDA FlashAttention kernels inside fast SRAM, push hundreds of GB/s across 24 to 48 GB VRAM, and keep 100% power under active cooling.</p>
        </Reveal>
        <Reveal i={1} className="hw-card">
          <Kicker>Why 4k vocab broke "Harry Potter"</Kicker>
          <h3>14M chopped rare names in half</h3>
          <p>At 4,096 pieces, Hedwig lacked a whole token for "Potter", splitting it and drifting to potatoes and a big pot of soup. At 8k and 16k pieces, the whole name stays intact.</p>
          <div className="hw-split">
            <span className="hw-tok">4k: "Harry"</span>
            <span className="hw-tok bad">"pot"</span>
            <span className="hw-tok bad">"ter"</span>
            <span className="hw-tok">→</span>
            <span className="hw-tok ok">16k: "Potter"</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 7. Three sizes & how much we improved ---------- */
function Scale({ reduced }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  return (
    <section ref={ref} className="hw-wrap hw-section" aria-labelledby="hw-scale-h">
      <Reveal><Kicker>How much we improved · $2.45 total</Kicker></Reveal>
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
      <div className="hw-tblwrap">
        <table className="hw-tbl">
          <thead>
            <tr><th>Metric</th><th className="num">13.8M Mac</th><th className="num">97.6M Cloud</th><th className="num">286.7M Flagship</th></tr>
          </thead>
          <tbody>
            <tr><td>Layout (layers × width × heads)</td><td className="num">6 × 384 × 6</td><td className="num">12 × 768 × 12</td><td className="num">20 × 1024 × 16</td></tr>
            <tr><td>Context / Vocabulary</td><td className="num">256 / 4,096</td><td className="num">256 / 8,192</td><td className="num">512 / 16,384</td></tr>
            <tr><td>Tokens read (per knob)</td><td className="num">~125M (~9 / knob)</td><td className="num">~164M (~1.7 / knob)</td><td className="num">~205M (~0.7 / knob)</td></tr>
            <tr><td>Stage 2 SFT / Stage 3 DPO win-rate</td><td className="num">1.438 / 92.5%</td><td className="num">1.336 / 96.7%</td><td className="num">1.341 / <b>98.3%</b></td></tr>
            <tr><td>4-bit compressed size</td><td className="num">7.9 MB</td><td className="num">55.2 MB</td><td className="num">161.9 MB</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 8. Interactive Showdown ---------- */
function Showdown() {
  const [idx, setIdx] = useState(0);
  const current = SHOWDOWNS[idx];
  return (
    <section className="hw-wrap hw-section" aria-labelledby="hw-show-h">
      <Reveal><Kicker>12 fixed prompts · same seed · same temperature</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-show-h" className="hw-h2">Bigger brains keep <em>every</em> detail.</h2></Reveal>
      <div className="hw-tabs" role="tablist" aria-label="Showdown prompts">
        {SHOWDOWNS.map((s, i) => (
          <button key={s.tab} type="button" role="tab" aria-selected={idx === i} className="hw-tab" onClick={() => setIdx(i)}>{s.tab}</button>
        ))}
      </div>
      <p className="hw-prompt"><span>You</span>{current.prompt}</p>
      <div className="hw-show">
        {current.rows.map(([size, line, verdict, status], i) => (
          <div key={`${idx}-${size}`} className="hw-page">
            <span className="hw-tag" style={{ color: SIZES[i].color }}>{size}</span>
            <p>{line}</p>
            <span className="hw-verdict" style={{ color: status === "ok" ? "#11734b" : status === "no" ? "#b4233c" : "#8a5a10" }}>
              {status === "ok" ? "✓" : status === "no" ? "✗" : "~"} {verdict}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 9. Hedwig vs GPT & Claude ---------- */
function Frontier({ reduced }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  return (
    <section ref={ref} className="hw-wrap hw-section" aria-labelledby="hw-front-h">
      <Reveal><Kicker>Hedwig vs GPT &amp; Claude</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-front-h" className="hw-h2">Same recipe. <em>10,000+ GPUs.</em></h2></Reveal>
      <Reveal i={2} as="p" className="hw-body">ChatGPT and Claude use the same Transformer blocks and three-stage loop (Pretrain, SFT, RLHF/DPO). The difference is cluster scale and reading volume: Flagship Hedwig read 0.7 tokens per knob on 1 RTX 4090, while frontier labs read 20+ tokens per knob across 10,000 to 100,000+ GPUs.</Reveal>

      <div className="hw-panel">
        <h3>Log scale of parameters &amp; hardware clusters</h3>
        <div className="hw-race">
          {FRONTIER_ROWS.map((r, i) => (
            <div key={r.name} className="hw-racer">
              <div className="hw-racer-lbl"><b>{r.name}</b><small>{r.gpus}</small></div>
              <div className="hw-rtrack">
                <motion.div className={`hw-rfill ${r.style}`} style={{ width: `${r.pct}%` }}
                  initial={{ scaleX: reduced ? 1 : 0 }} animate={seen ? { scaleX: 1 } : {}} transition={tween("scene", "out", i * 0.06)}>
                  {r.knobs} · {r.cost}
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hw-tblwrap">
        <table className="hw-tbl">
          <thead>
            <tr><th>Model</th><th className="num">Knobs</th><th>GPUs Used</th><th className="num">Tokens Read</th><th className="num">Tokens / Knob</th><th className="num">Cost (est.)</th></tr>
          </thead>
          <tbody>
            {FRONTIER_ROWS.map((r) => (
              <tr key={r.name}>
                <td><b>{r.name}</b></td>
                <td className="num">{r.knobs}</td>
                <td>{r.gpus}</td>
                <td className="num">{r.tokens}</td>
                <td className="num">{r.ratio}</td>
                <td className="num">{r.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 10. Films ---------- */
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

/* ---------- 11. Lessons + links ---------- */
function Lessons() {
  return (
    <section className="hw-wrap hw-section" aria-labelledby="hw-lessons-h">
      <Reveal><Kicker>What I took from it</Kicker></Reveal>
      <Reveal i={1}><h2 id="hw-lessons-h" className="hw-h2">What I learned building my own LLM.</h2></Reveal>
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
      <Stages reduced={reduced} />
      <Loophole />
      <WhyGpu reduced={reduced} />
      <Scale reduced={reduced} />
      <Showdown />
      <Frontier reduced={reduced} />
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
