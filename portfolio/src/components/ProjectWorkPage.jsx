import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ACCENTS, EARLIER_PROJECTS, FEATURED, FEATURED_GRID, MORE_PROJECTS, OPEN_SOURCE_PROJECTS } from "../data/projects";
import { DUR, EASE } from "../lib/motion";

// Every listed project on one page, as a plain index. Each row opens the
// project's own page at /work/<slug>/. Hidden projects stay out, same as
// on the main page.
const GROUPS = [
  { label: "Studies, skills & plugins", projects: OPEN_SOURCE_PROJECTS },
  { label: "Featured", projects: [...FEATURED, ...FEATURED_GRID] },
  { label: "More projects", projects: MORE_PROJECTS },
  { label: "Earlier work", projects: EARLIER_PROJECTS },
];

export default function ProjectWorkPage() {
  const total = GROUPS.reduce((n, g) => n + g.projects.length, 0);
  return (
    <div className="ed-case-study mx-auto min-h-full max-w-none px-5 pb-28 pt-28 sm:px-[max(24px,calc((100vw-1060px)/2))] sm:pt-32">
      <p className="font-mono text-xs uppercase tracking-[.16em] text-[color:var(--ink-400)]">{total} projects</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[color:var(--ink-100)] sm:text-5xl">Project Work</h1>
      <p className="mt-4 max-w-xl text-[color:var(--ink-200)]">Everything I've built, in one list. Open any project for the full story.</p>

      {GROUPS.filter((g) => g.projects.length).map((g) => (
        <section key={g.label} className="mt-14">
          <h2 className="inline-flex items-center gap-2.5 font-mono text-xs font-semibold uppercase tracking-[.14em] text-[#4b5262]"><span className="inline-block h-px w-5 bg-[#1d4ed8]" aria-hidden="true" />{g.label}</h2>
          <ul className="mt-4 border border-[#111318]/25 bg-white">
            {g.projects.map((p, i) => {
              const a = ACCENTS[p.accent] || ACCENTS.cyan;
              return (
                <motion.li
                  key={p.slug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.base, delay: Math.min(i * 0.03, 0.3), ease: EASE.out }}
                  className="border-b border-[#111318]/12 last:border-b-0"
                >
                  <a href={`/work/${p.slug}/`} className="group grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-5 transition-colors hover:bg-[#f4f3ef] sm:grid-cols-[minmax(0,16rem)_1fr_auto] sm:gap-8">
                    <span>
                      <span className="block font-display text-xl font-medium text-[#111318] transition-colors group-hover:text-[#1d4ed8]">
                        {p.title}
                      </span>
                      <span className={`mt-1 block font-mono text-[.68rem] uppercase tracking-[.1em] ${a.text}`}>{p.kind}</span>
                    </span>
                    <span className="hidden text-sm text-[#4b5262] sm:line-clamp-2">{p.hook}</span>
                    <ArrowUpRight size={18} className="text-[#4b5262] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#1d4ed8]" />
                  </a>
                </motion.li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
