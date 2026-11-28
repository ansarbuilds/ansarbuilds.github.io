import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { getProject } from "../data/projects";
import { LISTED_SLUGS, MORE, NOW, SHIPPED, isPublicLink } from "../data/site";
import { Button, Chips, Device, Reveal, Stats } from "./bits";

/* The page for a listed project, at /work/<slug>/.

   It opens on the same story the home page tells (four short paragraphs),
   then the proof: numbers, screens, how it works, what I learned, what it
   is built with. The long write-up and the limits sit at the end. The
   facts come from the project's entry in projects.js; the short story and
   the pictures from site.js. */

const SHOTS = Object.fromEntries([...SHIPPED, { ...NOW, star: NOW.copy }].map((item) => [item.slug, item]));
const MORE_BY_SLUG = Object.fromEntries(MORE.map((item) => [item.slug, item]));

function storyFor(slug, project) {
  return SHOTS[slug]?.star || (MORE_BY_SLUG[slug] ? [MORE_BY_SLUG[slug].copy] : project.story?.slice(0, 2) || []);
}

function Gallery({ slug, project }) {
  const gallery = SHOTS[slug]?.gallery || (project.shots || []).slice(1).map((src, i) => ({ src, alt: `${project.title}, screen ${i + 2}` }));
  const inset = SHOTS[slug]?.inset;
  const all = inset ? [{ src: inset.src, alt: inset.alt, caption: "The check-in" }, ...gallery] : gallery;
  const items = all.filter((item, i) => all.findIndex((other) => other.src === item.src) === i);
  if (!items.length) return null;
  return (
    <section className="ab-cs-block" aria-labelledby="cs-screens">
      <h2 id="cs-screens" className="ab-kicker">Screens</h2>
      <div className="ab-gallery">
        {items.map((item) => (
          <Reveal as="figure" key={item.src} className={item.tall ? "is-tall" : ""}>
            <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Links({ project }) {
  const links = (project.links || []).filter((link) => isPublicLink(link.href) && !link.href.startsWith(`/work/${project.slug}`));
  return (
    <div className="ab-actions">
      {links.map((link) => link.locked
        ? <span className="ab-btn is-locked" key={link.label}><Lock size={14} aria-hidden="true" /><span>{link.label}</span></span>
        : <Button key={link.href} href={link.href} primary={link.primary}>{link.label}</Button>)}
    </div>
  );
}

export default function CaseStudy({ slug }) {
  const project = getProject(slug);
  if (!project) return null;
  const spot = SHOTS[slug];
  const shot = spot?.shot || (project.shots?.[0] && { src: project.shots[0], alt: `${project.title}` });
  const stats = (project.stats || []).map((s) => [s.value, s.short || s.label]);
  const order = LISTED_SLUGS;
  const next = getProject(order[(order.indexOf(slug) + 1) % order.length]);
  const tag = spot?.tag || MORE_BY_SLUG[slug]?.tag || project.kind;
  const line = spot?.line || MORE_BY_SLUG[slug]?.line || project.hook;

  return (
    <article className="ab-cs" aria-labelledby="cs-title">
      <header className="ab-wrap ab-cs-head">
        <a className="ab-back" href="/#shipped"><ArrowLeft size={15} aria-hidden="true" /> All work</a>
        <p className="ab-kicker">{tag}</p>
        <h1 id="cs-title" className="ab-cs-title">{project.title}</h1>
        <p className="ab-line ab-cs-line">{line}</p>
        <p className="ab-status">{project.status}</p>
        <Links project={project} />
      </header>

      {shot && <div className="ab-wrap ab-cs-hero"><Device {...shot} name={`shot-${slug}`} eager /></div>}

      <div className="ab-wrap ab-cs-body">
        <section className="ab-cs-block ab-cs-story" aria-labelledby="cs-story">
          <h2 id="cs-story" className="ab-kicker">The short version</h2>
          {storyFor(slug, project).map((text, i) => <Reveal as="p" key={i} delay={i * 60} className={i === 0 ? "is-lead" : ""}>{text}</Reveal>)}
        </section>

        {stats.length > 0 && (
          <section className="ab-cs-block" aria-labelledby="cs-numbers">
            <h2 id="cs-numbers" className="ab-kicker">The numbers</h2>
            <Stats items={stats} className="is-wide" />
            <ul className="ab-cs-notes">{project.stats.filter((s) => s.short).map((s) => <li key={s.label}><strong>{s.value}</strong> {s.label}</li>)}</ul>
          </section>
        )}

        <Gallery slug={slug} project={project} />

        {project.how?.length > 0 && (
          <section className="ab-cs-block" aria-labelledby="cs-how">
            <h2 id="cs-how" className="ab-kicker">How it works</h2>
            <ol className="ab-steps">{project.how.map((text, i) => <Reveal as="li" key={i} delay={i * 50}><span className="ab-index">0{i + 1}</span><p>{text}</p></Reveal>)}</ol>
          </section>
        )}

        {project.learned?.length > 0 && (
          <section className="ab-cs-block" aria-labelledby="cs-learned">
            <h2 id="cs-learned" className="ab-kicker">What I learned</h2>
            <ul className="ab-learned">{project.learned.map((text) => <Reveal as="li" key={text}>{text}</Reveal>)}</ul>
          </section>
        )}

        {project.stack?.length > 0 && (
          <section className="ab-cs-block" aria-labelledby="cs-stack">
            <h2 id="cs-stack" className="ab-kicker">Built with</h2>
            {project.stackUsage
              ? <dl className="ab-stack">{project.stack.map((name) => <div key={name}><dt>{name}</dt><dd>{project.stackUsage[name] || ""}</dd></div>)}</dl>
              : <Chips items={project.stack} />}
          </section>
        )}

        {project.story?.length > storyFor(slug, project).length && (
          <section className="ab-cs-block" aria-labelledby="cs-long">
            <details className="ab-long">
              <summary><h2 id="cs-long" className="ab-kicker">The long version, limits included</h2></summary>
              {project.story.map((text, i) => <p key={i}>{text}</p>)}
              {project.role && <p className="ab-fine"><strong>My role.</strong> {project.role}</p>}
            </details>
          </section>
        )}

        {slug === "sirius" && <p className="ab-fine">{NOW.note}</p>}
      </div>

      {next && next.slug !== slug && (
        <nav className="ab-wrap ab-next" aria-label="Next project">
          <a href={`/work/${next.slug}/`}>
            <span className="ab-kicker">Next</span>
            <span className="ab-next-title">{next.title} <ArrowRight size={28} aria-hidden="true" /></span>
          </a>
        </nav>
      )}
    </article>
  );
}
