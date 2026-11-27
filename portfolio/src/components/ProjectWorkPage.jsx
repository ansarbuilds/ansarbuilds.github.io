import { ArrowUpRight } from "lucide-react";
import { ARCHIVE, ARCHIVE_TOTAL, oneLine } from "../data/archive";

// The full index: every project on the site, one line each, grouped by the
// kind of work. Rows are numbered across the whole list so the count reads
// at a glance; each opens the project's own page at /work/<slug>/.
// Where each group's numbering starts.
const STARTS = ARCHIVE.map((_, i) => ARCHIVE.slice(0, i).reduce((sum, g) => sum + g.projects.length, 0));

export default function ProjectWorkPage() {
  return (
    <div className="ed-case-study ix-page">
      <p className="ix-kicker">Index · {ARCHIVE_TOTAL} projects</p>
      <h1 className="ix-title">Everything I've built</h1>
      <p className="ix-lede">
        From a language model trained from scratch to the scripts I started with. The featured ones have full write-ups; the rest have a page each, some short.
      </p>

      {ARCHIVE.map((group, gi) => (
        <section key={group.id} className="ix-group" aria-labelledby={`ix-${group.id}`}>
          <h2 id={`ix-${group.id}`} className="ix-group-h">
            <span>{group.label}</span>
            <small>{group.projects.length}</small>
          </h2>
          <ol className="ix-rows">
            {group.projects.map((p, i) => {
              const n = STARTS[gi] + i + 1;
              return (
                <li key={p.slug}>
                  <a href={`/work/${p.slug}/`} className="ix-row">
                    <span className="ix-n">{String(n).padStart(2, "0")}</span>
                    <span className="ix-name">
                      <b>{p.title}</b>
                      <small>{p.kind}</small>
                    </span>
                    <span className="ix-line">{oneLine(p.hook)}</span>
                    <span className="ix-status">{p.status}</span>
                    <ArrowUpRight size={15} aria-hidden="true" className="ix-arrow" />
                  </a>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
