# Mohamed Ansar, portfolio

The source for [ansarbuilds.dev](https://ansarbuilds.dev). React 19, Vite 8 and Tailwind v4, with one hand-written WebGL shader.

## The story the home page tells

One page, in this order (`src/components/Home.jsx`, copy in `src/data/site.js`):

1. **Intro** (`Intro.jsx`): about seven seconds, once per visit. Three lines set letter by letter: the name, what I build, what I'm building now. Any key, click, scroll or the Skip button ends it. Never with reduced motion, Save-Data, a 2G connection or a link to a section. `?intro=1` forces it, `?intro=0` turns it off.
2. **Hero** (`#top`): the claim, and four numbers: lines of code, repositories, commits, apps released.
3. **Who I am** (`#about`).
4. **Now** (`#now`): Sirius, the app in progress, with its models' numbers and the live demo.
5. **Shipped** (`#shipped`): Hermione, saywhen and Haloscript, each told as situation, task, action, result, with numbers, stack and a screenshot that tilts toward the pointer.
6. **More shipped work** (`#more`): Agent Flight Recorder.
7. **How I work** (`#how`) and **Contact** (`#contact`).

Each project opens at `/work/<slug>/` (`CaseStudy.jsx`): the short version, numbers with their notes, screens, how it works, what I learned, the stack, then the long version.

## What is listed, and the numbers

- **Listed projects** are `LISTED_SLUGS` in `src/data/site.js`. Only they appear on the home page, in `/work/`, the command palette and the sitemap. Every other project still has its page at `/work/<slug>/` (older ones keep their original design, wrapped in `.legacy`), marked `noindex`.
- **Private repositories** are named in `PRIVATE_REPOS`. Links to them are dropped from case studies, so no visitor lands on a 404. Remove a name when that repository goes public.
- **The code numbers are the profile README's.** `npm run sync:telemetry` (run before every build) reads `code-telemetry.svg` and `build-hours.svg` from the `ansarbuilds/ansarbuilds` profile repository and writes `src/data/telemetry.json`. If the fetch fails, the saved numbers stay. The deploy workflow runs daily, so the site follows the README within a day.
- **Hermione's numbers** on the home page come from its entry in `projects.js`, so the spotlight and its page always agree.

## Look and motion

- **Theme.** Light (stone) and dark (obsidian), with cobalt as the one accent. It follows the system until the visitor picks one with the switch in the nav, which is remembered. A script in `index.html` sets it before the first paint. Tokens are at the top of `src/site.css`; `src/lib/theme.test.mjs` holds every text pairing to AA contrast in both themes.
- **The light field** (`Field.jsx`, `lib/fieldShader.js`) is one full-screen WebGL2 fragment shader: domain-warped noise in cobalt, violet and cyan, thin lines where it folds, a swirl that follows the pointer, grain. It is quiet on the left where text sits and quietens as the page scrolls. It renders at half resolution, stops when the tab is hidden, and draws one still frame for reduced motion. Without WebGL a CSS gradient shows instead.
- **Page changes** use the View Transitions API: a project's screenshot carries over from the home page to its case study.
- **Scroll reveals** use one IntersectionObserver per element (`bits.jsx`); device frames enter with CSS scroll-driven animations where supported.
- `MOTION.md` has the older motion rules, still used by the legacy pages.

## URLs and the build

- **Every view has a real URL** (`src/lib/routes.js`). Old hash links (`/#project/saywhen`) still open the right view and are rewritten.
- **Each URL is a file.** After `vite build`, `scripts/prerender-routes.mjs` writes `dist/work/<slug>/index.html` and the other views with their own title, description, canonical URL, share image and JSON-LD, plus a static version of the page for readers that don't run scripts. It writes `404.html` and the sitemap too.
- **Budgets.** `npm run check:budget` fails the build past the limits in `scripts/check-budget.mjs`. First-load JS is about 87 kB gzipped.
- **Project data** for the home page and index comes from `src/data/projectIndex.js`, a generated slim copy of `projects.js`. After editing `projects.js`, run `node scripts/make-project-index.mjs`; a unit test fails if you forget.
- **Share images.** `PW_CHANNEL=chrome node scripts/make-share-images.mjs [slugs]` draws the site card (`public/og-image.png`) and a card per project at `public/p/<slug>/og.jpg`. saywhen's and Hermione's cards are made separately and left alone.

## Where things live

```
src/
  data/site.js           home page copy, listed projects, private repos, intro lines
  data/telemetry.json    synced code numbers (do not edit by hand)
  data/projects.js       every project's full story, stats, stack and links
  components/
    Home.jsx             the home page sections
    CaseStudy.jsx        /work/<slug>/ for listed projects
    ProjectWorkPage.jsx  /work/
    Intro.jsx, Field.jsx the intro and the light field
    bits.jsx             reveal, count-up numbers, device frame, buttons
    ProjectPage.jsx, HedwigPage.jsx, DataLineageExplorer.jsx   older pages
  site.css               the design system
scripts/                 prerender, telemetry sync, share images, budget
tests/browser/           Playwright: story order, intro, theme, routing, a11y, phone widths
```

## Adding a project to the home page

Write its full entry in `src/data/projects.js`, regenerate the index, then add its slug to `LISTED_SLUGS` and its spotlight (line, STAR paragraphs, stats, stack, screenshot) to `SHIPPED` or `MORE` in `src/data/site.js`. Add it to `public/sitemap.xml`.

## Writing style

Plain words, first person, short sentences, no em dashes. Work projects stay generic: no employer, product, customer or retailer names, and no numbers.

## saywhen launch page

`public/p/saywhen/index.html` is a standalone page at `/p/saywhen/` with the 60-second launch film (`demo.mp4`, a re-encode of the film in the saywhen repository), its poster and the share image. `real-run.mp4` is a real 23-second screen recording, cropped and silent, shown under the film, with a `.jpg` poster. The survey figures stay in the page text. `public/p/saywhen/loops/` holds five short silent loops (MP4, with a WebP still each) rendered from the saywhen repository's `docs/visuals/animated/`. They play only while on screen, and not at all for reduced motion or data saver. They are illustrations, not screen recordings. The saywhen README links to it, so keep the URL stable. `public/shots/spotlight/saywhen.webp` is the film's poster frame, an illustration and not a screenshot. `public/shots/saywhen/home-preview.webp` is the app in its browser demo mode.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run lint
npm run test:unit
PW_CHANNEL=chrome npx playwright test
```

## Deploy

`.github/workflows/deploy-portfolio.yml` builds and publishes to GitHub Pages on every push to `main` that touches `portfolio/**`. Pages must be set to the **GitHub Actions** source.

## Deploy

`.github/workflows/deploy-portfolio.yml` builds and publishes to GitHub Pages on every push to `main` that touches `portfolio/**`, and once a day so the code numbers stay in sync. Pages must be set to the **GitHub Actions** source.

## Artwork

`public/shots/spotlight/storyera.webp`, `agent-flight-recorder.jpg`, and `exposure-audit.jpg` are original AI-generated editorial illustrations, not application screenshots. The prompts for the two newer covers are in [ARTWORK_PROMPTS.md](ARTWORK_PROMPTS.md). The two StoryEra diagrams in `public/shots/storyera/` come from the MIT-licensed StoryEra repository. `public/shots/spotlight/jarvis.webp` is also an editorial illustration, not a screenshot; the real Jarvis dashboard is shown in `public/shots/jarvis/dashboard.webp` and the demo at `/p/jarvis/demo/`.
