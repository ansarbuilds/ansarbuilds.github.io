import { ArrowRight, ArrowUpRight } from "lucide-react";
import { LISTED_PROJECTS } from "../data/projectIndex";
import { NOW, PERSON, SHIPPED } from "../data/site";
import { Reveal } from "./bits";

/* /work/: every listed project in one list. Older experiments, course work
   and studies stay on GitHub rather than here. */

const PICTURES = Object.fromEntries([...SHIPPED, NOW].map((item) => [item.slug, item.shot?.src]));

export default function ProjectWorkPage() {
  return (
    <section className="ab-wrap ab-index-page" aria-labelledby="work-title">
      <p className="ab-kicker">Index</p>
      <h1 id="work-title" className="ab-cs-title">Work</h1>
      <p className="ab-line">Everything I've shipped or am building now, in one list.</p>
      <ol className="ab-index-list">
        {LISTED_PROJECTS.map((project, i) => (
          <Reveal as="li" key={project.slug} delay={i * 50}>
            <a href={`/work/${project.slug}/`}>
              <span className="ab-index">0{i + 1}</span>
              <span className="ab-index-title">{project.title}</span>
              <span className="ab-index-kind">{project.kind}</span>
              <span className="ab-index-status">{project.status.split(" · ")[0]}</span>
              <ArrowRight size={20} aria-hidden="true" />
              {PICTURES[project.slug] && <img className="ab-index-peek" src={PICTURES[project.slug]} alt="" loading="lazy" aria-hidden="true" />}
            </a>
          </Reveal>
        ))}
      </ol>
      <p className="ab-fine">
        Older experiments, studies and course work are on <a href={PERSON.github} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={12} aria-hidden="true" /></a>.
      </p>
    </section>
  );
}
