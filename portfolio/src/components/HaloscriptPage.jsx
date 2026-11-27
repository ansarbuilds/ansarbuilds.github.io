import { ArrowLeft, ArrowUpRight, Lock } from "lucide-react";
import { DEPTH } from "../data/depth";

const IMG = (name) => `${import.meta.env.BASE_URL}shots/haloscript/${name}`;
const SITE_URL = "https://ansarbuilds.github.io/haloscript-site/";
const APP_STORE_URL = "https://apps.apple.com/ca/app/haloscript/id6820670080";
const CORAL_INK = "#a8323c";
const D = DEPTH.haloscript;

const STATS = [
  ["3", "devices, one SwiftUI codebase: Mac, iPad, iPhone"],
  ["~30k", "lines of Swift across 180 files"],
  ["0", "accounts, ads, analytics or servers"],
  ["Free", "on the App Store at launch"],
];

const MAC = [
  ["write_mac.jpg", "Write", "A focused scene editor with rich text, page themes and word counts that roll up the binder."],
  ["corkboard_mac.jpg", "Corkboard", "Index cards for every scene. Drag to reorder, or move a scene to another chapter."],
  ["outline_mac.jpg", "Outline", "The whole manuscript at a glance, with status, POV and plotline tags."],
  ["storybible_mac.jpg", "Story Bible", "Characters, locations, research and ideas, kept with each novel."],
];

const IPAD = [
  ["write_ipad.jpg", "Writing on iPad"],
  ["corkboard_ipad.jpg", "Corkboard on iPad"],
  ["board_ipad.jpg", "Whiteboard with Apple Pencil"],
];

const IPHONE = [
  ["home_iphone.jpg", "Home"],
  ["write_iphone.jpg", "Write"],
  ["corkboard_iphone.jpg", "Corkboard"],
];

const FEATURES = [
  ["Writing", [
    "Parts, chapters and scenes in a binder, with a status per scene",
    "Rich-text scene editor with autosave and focus mode",
    "Daily word goal with a streak, plus a whole-novel goal",
    "Scene snapshots with restore, and find & replace across the book",
    "Import from Word or Markdown; export to Word, ePub, Markdown and text",
  ]],
  ["Whiteboard", [
    "Infinite canvas: sticky notes, text, shapes, connectors and charts",
    "A plot board per novel, with one column per chapter mirroring its scenes",
    "Writer templates: three-act, hero's journey, save the cat",
  ]],
  ["Apple Pencil", [
    "Pressure-sensitive ink with palm rejection",
    "A hover ring that previews the brush",
    "Pencil Pro squeeze or double-tap to switch pen and select",
  ]],
  ["Safe by design", [
    "Soft delete with a 30-day Recently Deleted",
    "Full backup and restore",
    "A visible save and sync status, always",
  ]],
];

const ROAD = [
  ["done", "Novel and whiteboard core, built and verified on the Mac, iPad and iPhone simulators"],
  ["done", "iCloud sync wired up, with the conflict rules below"],
  ["done", "Writer templates, import, and save-on-background"],
  ["done", "CloudKit schema deployed to production; iOS, iPadOS and macOS builds uploaded to TestFlight"],
  ["done", "App Store listing, privacy policy and screenshots for all three platforms"],
  ["next", "Two-device sync test on real hardware"],
  ["done", "Launched on the App Store"],
];

const LESSONS = [
  ["Design the data for year five.", "CloudKit schemas can only grow. Every field needs a default, nothing gets renamed, and deletes are soft. Getting that right on day one is cheaper than any migration."],
  ["Sync is a product feature.", "Making each whiteboard element its own record, with a small tested merge, is what lets a Pencil stroke on the iPad and a typed note on the Mac both survive."],
  ["Cut scope with a date.", "A written cut-line for launch (must ship, if time allows, v1.1) kept the first version shippable instead of endless."],
  ["Free, private, no AI in v1.", "No accounts and no backend means nothing to run, nothing to breach, and nothing between a writer and the first sentence."],
];

function Shot({ src, alt, className = "" }) {
  return (
    <img src={IMG(src)} alt={alt} loading="lazy"
      className={`w-full border border-black bg-white shadow-[8px_8px_0_#000] ${className}`} />
  );
}

/* Showcase page for Haloscript: a tour of the app across devices and
   how it's built. The source is private; only screenshots and the
   design are shown here. */
export default function HaloscriptPage() {
  return (
    <div className="bg-transparent text-black">
      <header className="mx-auto max-w-5xl px-5 pt-24 sm:px-8 sm:pt-28">
        <a href="#card-haloscript" className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[.12em]" style={{ color: CORAL_INK }}>
          <ArrowLeft size={13} /> Back to projects
        </a>
        <div className="mt-8 flex items-center gap-4">
          <img src={IMG("icon.png")} alt="Haloscript app icon" className="h-16 w-16 border border-black shadow-[4px_4px_0_#000] sm:h-20 sm:w-20" />
          <div>
            <h1 className="font-display text-4xl font-normal tracking-tight text-black sm:text-5xl">Haloscript</h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-[.12em]" style={{ color: CORAL_INK }}>
              Mac · iPad · iPhone · Live on the App Store
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-[#2b2b2b]">
          A writing app for novelists, with an infinite whiteboard beside the manuscript. Plan on a corkboard, keep a Story
          Bible, sketch with Apple Pencil, and write in a focused editor. Everything syncs privately through the writer's own
          iCloud. No accounts, no ads, no analytics.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-black bg-[#e57981] px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[.06em] text-black shadow-[4px_4px_0_#000] hover:bg-[#d35f68]">Get it on the App Store <ArrowUpRight size={15} /></a>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 border border-black bg-[#eceae8] px-5 py-3 font-mono text-xs font-medium uppercase tracking-[.06em] text-black hover:bg-[#e1dfdd] hover:shadow-[2px_2px_0_#000]">
            Support and privacy <ArrowUpRight size={15} />
          </a>
          <a href="#contact" className="inline-flex min-h-11 items-center gap-2 border border-black bg-[#eceae8] px-4 py-2.5 font-mono text-xs uppercase tracking-[.06em] text-black hover:bg-[#e1dfdd] hover:shadow-[2px_2px_0_#000]">
            <Lock size={14} /> Source is private. Walkthrough on request.
          </a>
        </div>
        <Shot src="hero_home_mac.jpg" alt="Haloscript home on the Mac: choose Novel or Whiteboard" className="mt-12" />
      </header>

      <article className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(([big, small]) => (
            <div key={small} className="border border-black bg-white p-4 shadow-[4px_4px_0_#000]">
              <dt className="font-display text-3xl font-normal text-black">{big}</dt>
              <dd className="mt-1 text-xs leading-snug text-[#545454]">{small}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">On the Mac</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {MAC.map(([img, title, cap]) => (
            <figure key={img}>
              <Shot src={img} alt={`${title} on the Mac`} />
              <figcaption className="mt-3 text-[#545454]"><span className="font-semibold text-black">{title}.</span> {cap}</figcaption>
            </figure>
          ))}
        </div>
        <figure className="mt-8">
          <Shot src="whiteboard_mac.jpg" alt="The infinite whiteboard on the Mac" />
          <figcaption className="mt-3 text-[#545454]"><span className="font-semibold text-black">Whiteboard.</span> An infinite canvas for notes, shapes, connectors, charts and freehand ink, with a plot board linked to every novel.</figcaption>
        </figure>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">On the iPad, with Apple Pencil</h2>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {IPAD.map(([img, alt]) => (
            <figure key={img}>
              <Shot src={img} alt={alt} />
              <figcaption className="mt-2 text-xs text-[#545454]">{alt}</figcaption>
            </figure>
          ))}
        </div>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">On the iPhone</h2>
        <div className="mt-6 grid max-w-2xl grid-cols-3 gap-4">
          {IPHONE.map(([img, alt]) => (
            <figure key={img}>
              <Shot src={img} alt={`iPhone: ${alt}`} />
              <figcaption className="mt-2 text-xs text-[#545454]">{alt}</figcaption>
            </figure>
          ))}
        </div>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">What it does</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(([head, items]) => (
            <section key={head} className="border border-black bg-white p-5 shadow-[8px_8px_0_#000]">
              <h3 className="font-display text-xl font-medium text-black">{head}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#2b2b2b]">
                {items.map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0" style={{ background: "#e57981" }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">How it's built</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#2b2b2b]">
          One SwiftUI app target runs on macOS, iPadOS and iOS. The same SwiftData models drive every screen, and CloudKit
          syncs them through the writer's private iCloud, so there's no server of mine anywhere in the loop. The hard part
          was making sync safe when two devices edit at once.
        </p>
        <figure className="mt-6 overflow-hidden border border-black bg-white shadow-[8px_8px_0_#000]">
          <img src={IMG("architecture.svg")} alt="Architecture: Mac, iPad and iPhone share one SwiftUI app and SwiftData models, synced through private iCloud. Whiteboard elements merge per element; scene text keeps the other version as a snapshot." className="w-full" loading="lazy" />
        </figure>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#545454]">
          Platform-independent logic (word counting, streaks, search and replace, stylus pressure, and the ZIP, DOCX and ePub
          writers) is covered by a test script that runs without an Xcode test target.
        </p>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">Road to launch</h2>
        <ol className="mt-6 space-y-3">
          {ROAD.map(([state, text]) => (
            <li key={text} className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex h-6 shrink-0 items-center border border-black px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[.1em] ${state === "done" ? "bg-[#e57981] text-black" : "bg-[#eceae8] text-black"}`}>
                {state === "done" ? "Done" : "Next"}
              </span>
              <span className="leading-relaxed text-[#2b2b2b]">{text}</span>
            </li>
          ))}
        </ol>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">How I found the problem</h2>
        <p className="mt-4 text-base leading-relaxed text-[#2b2b2b]">{D.found}</p>

        <h2 className="mt-16 font-display text-3xl font-normal text-black">Trade-offs I made</h2>
        <ul className="mt-6 space-y-3">
          {D.tradeoffs.map((t) => (
            <li key={t.chose} className="border border-black bg-white p-5 leading-relaxed shadow-[4px_4px_0_#000]">
              <span className="font-semibold" style={{ color: CORAL_INK }}>{t.chose}</span>
              <span className="text-[#545454]"> over </span>
              <span className="font-semibold text-black">{t.over}</span>
              <span className="mt-1.5 block text-sm text-[#2b2b2b]">Because {t.because}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-16 font-display text-3xl font-normal text-black">{D.ai.label}</h2>
        <p className="mt-4 text-base leading-relaxed text-[#2b2b2b]">{D.ai.text}</p>

        <h2 className="mt-20 font-display text-3xl font-normal text-black">What I learned</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {LESSONS.map(([head, body]) => (
            <li key={head} className="border border-black bg-white p-5 shadow-[4px_4px_0_#000]">
              <p className="font-display text-lg font-medium text-black">{head}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#545454]">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-black bg-[#e57981] px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[.06em] text-black shadow-[4px_4px_0_#000] hover:bg-[#d35f68]">
            Get Haloscript on the App Store
          </a>
          <a href="#card-haloscript" className="inline-flex min-h-11 items-center border border-black bg-[#eceae8] px-4 py-2.5 font-mono text-xs uppercase tracking-[.06em] text-black hover:bg-[#e1dfdd] hover:shadow-[2px_2px_0_#000]">Back to projects</a>
        </div>
      </article>
    </div>
  );
}
