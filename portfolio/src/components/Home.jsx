import { ArrowDown, ArrowRight } from "lucide-react";
import { CONTACT, HERO, HOW_I_WORK, MORE, NOW, PERSON, SHIPPED, STORY } from "../data/site";
import { getProject } from "../data/projectIndex";
import TELEMETRY from "../data/telemetry.json";
import { Button, Chips, CountUp, Device, Reveal, Stats } from "./bits";

/* The home page, in the order the story is told:
   hero, who I am, what I'm building now, what I've shipped, more work,
   how I work, and how to reach me. */

const projectHref = (slug) => `/work/${slug}/`;

// Hermione's numbers come from its own entry, so they always match its page.
function statsFor(item) {
  if (item.statsFrom !== "project") return item.stats;
  const project = getProject(item.slug);
  return (project?.stats || []).slice(0, 3).map((s) => [s.value, s.short || s.label]);
}

function Hero({ arriving }) {
  const numbers = [
    [TELEMETRY.lines.toLocaleString("en-US"), "lines of code committed"],
    [String(TELEMETRY.repos), "repositories"],
    [TELEMETRY.commits.toLocaleString("en-US"), "commits"],
    ["3", "apps released"],
  ];
  return (
    <section className={`ab-hero ${arriving ? "is-arriving" : ""}`} id="top" aria-labelledby="hero-title">
      <div className="ab-wrap">
        <p className="ab-kicker ab-hero-kicker"><span className="ab-dot" aria-hidden="true" />{HERO.kicker}</p>
        <h1 id="hero-title" className="ab-hero-title">
          <span className="sr-only">{PERSON.name}. </span>
          {HERO.title.map((line, i) => <span className="ab-hero-line" style={{ "--i": i }} key={line}><span>{line}</span></span>)}
        </h1>
        <p className="ab-hero-lede">{HERO.lede}</p>
        <div className="ab-hero-actions">
          <a className="ab-btn is-primary" href="#shipped"><span>See what I've shipped</span><ArrowDown size={15} aria-hidden="true" /></a>
          <a className="ab-btn" href="#contact"><span>Say hi</span></a>
        </div>
      </div>
      <div className="ab-wrap ab-hero-foot">
        <dl className="ab-telemetry">
          {numbers.map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="ab-telemetry-value"><CountUp value={value} /></dd>
              <dd className="ab-telemetry-label" aria-hidden="true">{label}</dd>
            </div>
          ))}
        </dl>
        <p className="ab-telemetry-note">Counted across every repository I own, public and private, the same way as <a href={TELEMETRY.source} target="_blank" rel="noopener noreferrer">my GitHub profile</a>. Synced {TELEMETRY.syncedAt}.</p>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="ab-section ab-story" id="about" aria-labelledby="story-title">
      <div className="ab-wrap ab-split">
        <Reveal className="ab-split-label"><p className="ab-kicker">01 · {STORY.title}</p></Reveal>
        <div className="ab-story-body">
          <h2 id="story-title" className="sr-only">{STORY.title}</h2>
          {STORY.paragraphs.map((text, i) => <Reveal as="p" key={i} delay={i * 80} className={i === 0 ? "is-lead" : ""}>{text}</Reveal>)}
        </div>
      </div>
    </section>
  );
}

function Now() {
  return (
    <section className="ab-section ab-now" id="now" aria-labelledby="now-title">
      <div className="ab-wrap">
        <Reveal className="ab-section-head">
          <p className="ab-kicker">02 · Now</p>
        </Reveal>
        <div className="ab-now-card">
          <div className="ab-now-text">
            <Reveal><p className="ab-live"><span className="ab-live-dot" aria-hidden="true" />{NOW.label} · {NOW.status}</p></Reveal>
            <Reveal delay={60}><h2 id="now-title" className="ab-title-xl">{NOW.title}</h2></Reveal>
            <Reveal delay={120}><p className="ab-line">{NOW.line}</p></Reveal>
            {NOW.copy.map((text, i) => <Reveal as="p" className="ab-copy" delay={160 + i * 60} key={i}>{text}</Reveal>)}
            <Reveal delay={240}><Stats items={NOW.stats} /></Reveal>
            <Reveal delay={280} className="ab-actions">
              {NOW.links.map((link) => <Button key={link.href} href={link.href} primary={link.primary}>{link.label}</Button>)}
              <a className="ab-text-link" href={projectHref(NOW.slug)}>Read more <ArrowRight size={14} aria-hidden="true" /></a>
            </Reveal>
            <p className="ab-fine">{NOW.note}</p>
          </div>
          <Device {...NOW.shot} name="shot-sirius" className="ab-now-shot">
            <img className="ab-now-inset" src={NOW.inset.src} alt={NOW.inset.alt} width={NOW.inset.w} height={NOW.inset.h} loading="lazy" decoding="async" />
          </Device>
        </div>
      </div>
    </section>
  );
}

function Spotlight({ item, flip }) {
  const project = getProject(item.slug);
  const title = project?.title || item.slug;
  return (
    <article className={`ab-spot ${flip ? "is-flipped" : ""}`} id={`shipped-${item.slug}`} aria-labelledby={`spot-${item.slug}`}>
      <Device {...item.shot} name={`shot-${item.slug}`} className="ab-spot-shot" />
      <div className="ab-spot-text">
        <Reveal><p className="ab-kicker"><span className="ab-index">{item.index}</span>{item.tag}</p></Reveal>
        <Reveal delay={50}><h3 id={`spot-${item.slug}`} className="ab-title-xl"><a href={projectHref(item.slug)}>{title}</a></h3></Reveal>
        <Reveal delay={100}><p className="ab-line">{item.line}</p></Reveal>
        <div className="ab-star">
          {item.star.map((text, i) => <Reveal as="p" delay={140 + i * 50} key={i}>{text}</Reveal>)}
        </div>
        <Reveal delay={200}><Stats items={statsFor(item)} /></Reveal>
        <Reveal delay={240}><Chips items={item.stack} /></Reveal>
        <Reveal delay={280} className="ab-actions">
          <a className="ab-btn is-primary" href={projectHref(item.slug)}><span>The full story</span><ArrowRight size={15} aria-hidden="true" /></a>
        </Reveal>
      </div>
    </article>
  );
}

function Shipped() {
  return (
    <section className="ab-section ab-shipped" id="shipped" aria-labelledby="shipped-title">
      <div className="ab-wrap">
        <Reveal className="ab-section-head">
          <p className="ab-kicker">03 · Shipped</p>
          <h2 id="shipped-title" className="ab-title-section">Three things I built, finished, and put out in the world.</h2>
        </Reveal>
        <div className="ab-spots">
          {SHIPPED.map((item, i) => <Spotlight item={item} flip={i % 2 === 1} key={item.slug} />)}
        </div>
      </div>
    </section>
  );
}

function More() {
  return (
    <section className="ab-section ab-more" id="more" aria-labelledby="more-title">
      <div className="ab-wrap">
        <Reveal className="ab-section-head">
          <p className="ab-kicker">04 · More shipped work</p>
          <h2 id="more-title" className="sr-only">More shipped work</h2>
        </Reveal>
        {MORE.map((item) => (
          <Reveal as="article" className="ab-more-card" key={item.slug} aria-labelledby={`more-${item.slug}`}>
            <div>
              <p className="ab-kicker">{item.tag}</p>
              <h3 id={`more-${item.slug}`} className="ab-title-l"><a href={projectHref(item.slug)}>{item.title}</a></h3>
              <p className="ab-line">{item.line}</p>
              <p className="ab-copy">{item.copy}</p>
              <div className="ab-actions">
                {item.links.map((link) => <Button key={link.href} href={link.href} primary={link.primary}>{link.label}</Button>)}
                <a className="ab-text-link" href={projectHref(item.slug)}>Read more <ArrowRight size={14} aria-hidden="true" /></a>
              </div>
            </div>
            <div className="ab-terminal" aria-label="Illustration of a recorded agent run" role="img">
              <p className="ab-terminal-bar"><i /><i /><i /><span>flight-recorder investigate</span></p>
              <p><b className="is-dim">edit</b> payment_service.py <em>−2 lines</em></p>
              <p><b className="is-dim">run</b> pytest tests/test_payments.py</p>
              <p><b className="is-bad">fail</b> accepted a duplicate payment</p>
              <p><b className="is-good">suspect</b> step 3 removed <code>if already_paid</code></p>
              <p><b className="is-dim">evidence</b> diff + failing assertion</p>
            </div>
            <Stats items={item.stats} className="ab-more-stats" />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function HowIWork() {
  return (
    <section className="ab-section ab-how" id="how" aria-labelledby="how-title">
      <div className="ab-wrap ab-split">
        <Reveal className="ab-split-label"><p className="ab-kicker">05 · {HOW_I_WORK.title}</p><h2 id="how-title" className="sr-only">{HOW_I_WORK.title}</h2></Reveal>
        <div>
          <ol className="ab-principles">
            {HOW_I_WORK.points.map(([lead, text], i) => (
              <Reveal as="li" delay={i * 70} key={lead}><span className="ab-index">0{i + 1}</span><p><strong>{lead}</strong> {text}</p></Reveal>
            ))}
          </ol>
          <Reveal as="dl" className="ab-tools">
            {HOW_I_WORK.tools.map(([group, list]) => <div key={group}><dt>{group}</dt><dd>{list}</dd></div>)}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="ab-section ab-contact" id="contact" aria-labelledby="contact-title">
      <div className="ab-wrap">
        <Reveal><p className="ab-kicker">06 · Contact</p></Reveal>
        <Reveal delay={60}><h2 id="contact-title" className="ab-contact-title">{CONTACT.title}</h2></Reveal>
        <Reveal delay={120}><p className="ab-line">{CONTACT.line}</p></Reveal>
        <Reveal delay={160}><a className="ab-email" href={`mailto:${PERSON.email}`}>{PERSON.email}</a></Reveal>
        <Reveal delay={200} className="ab-actions">
          <Button href={PERSON.github}>GitHub</Button>
          <Button href={PERSON.linkedin}>LinkedIn</Button>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home({ arriving = false }) {
  return (
    <>
      <Hero arriving={arriving} />
      <Story />
      <Now />
      <Shipped />
      <More />
      <HowIWork />
      <Contact />
    </>
  );
}
