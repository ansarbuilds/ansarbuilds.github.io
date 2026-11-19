import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ColdOpen from "./ColdOpen";
import ActOne from "./ActOne";
import ActTwo from "./ActTwo";
import { BUILT } from "./actTwo/built";
import { RECEIPTS } from "../data/content";
import { FLAGSHIPS, STACK_MARQUEE } from "../data/showcase";
import { LISTED_PROJECTS, getProject } from "../data/projects";
import { scrollToTop } from "../lib/scroll";

/* The reel the visitor chose to play on /reel/: the cold open, Act I and
   Act II, in that order. It is never part of the home page; only
   components/Reel.jsx imports it, and only after Play.

   A "Back to the work" link sits on every frame. The cold open builds its
   name on the title card's <h1 id="hero-name">, so its last frame and the
   card are the same picture. */
const STATEMENT = { lead: "Most AI demos stop at the demo.", rest: "Mine ship with tests, real numbers and a write-up, including the parts that failed." };
const RECEIPT_VALUES = RECEIPTS.map((item) => ({ ...item, value: item.value === "PROJECTS" ? `${LISTED_PROJECTS.length}+` : item.value }));

// What each set's screens are, said on its card: nothing in the film
// passes for more than it is.
const FILM_NOTES = { saywhen: "Screen: the launch animation", jarvis: "Screens: the real dashboard, sample data", "agent-flight-recorder": "Illustration of a recorded run", "prh-jepa": "Illustration of the finding", haloscript: "Screens: the real app" };
const FILM_PROJECTS = BUILT.map((slug) => {
  const flag = FLAGSHIPS.find((item) => item.slug === slug);
  const project = getProject(slug);
  return { slug, name: project.title, eyebrow: flag.eyebrow, headline: flag.headline, stats: flag.stats, note: FILM_NOTES[slug], links: project.links.filter((link) => !link.locked && link.href !== `/work/${slug}/`).slice(0, 2) };
});

function Plain() {
  return <section className="reel-end" aria-label="The short version"><p>{STATEMENT.lead} {STATEMENT.rest}</p></section>;
}

export default function ReelFilm() {
  const [opening, setOpening] = useState(true);
  const [since] = useState(() => performance.now());
  useEffect(() => { scrollToTop({ instant: true }); }, []);
  const done = useCallback(() => setOpening(false), []);
  const noop = useCallback(() => {}, []);
  return <div className="reel-film">
    <a href="/#projects" className="reel-back"><ArrowLeft size={16} aria-hidden="true" />Back to the work</a>
    <section className="reel-title sc-hero" aria-labelledby="hero-name">
      <h1 id="hero-name" className="sc-hero-name" aria-label="Mohamed Ansar">
        <span className="sc-name-line" aria-hidden="true"><span>MOHAMED</span></span>
        <span className="sc-name-line" aria-hidden="true"><span className="is-outline">ANSAR</span></span>
      </h1>
    </section>
    <ActOne receipts={RECEIPT_VALUES} tools={STACK_MARQUEE} lead={STATEMENT.lead} rest={STATEMENT.rest} fallback={<Plain />} />
    <ActTwo projects={FILM_PROJECTS} />
    <section className="reel-end">
      <h2>That was five of the six.</h2>
      <a href="/#projects" className="reel-play">See all six projects<ArrowUpRight size={16} aria-hidden="true" /></a>
    </section>
    {opening && <ColdOpen mode="full" since={since} onHandOver={noop} onDone={done} />}
  </div>;
}
