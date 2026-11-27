# Mohamed Ansar, portfolio

The source for [ansarbuilds.dev](https://ansarbuilds.dev).
React 19, Vite, Tailwind v4 and Framer Motion.

## How the site is laid out

A portfolio of agents, AI studies and shipped apps, with the proof for each. One scrolling page, then a page per project:

1. **Hero** (`#hero`): the claim (a language model trained from scratch, 286.7M parameters for $2.45) beside `HedwigTrace.jsx`, a real recorded run of the Hedwig model replayed one token at a time, with the three tokens it was choosing between drawn as rows of square dots. Nothing in it is generated on the page. It pauses off-screen; reduced motion shows one still step.
2. **The short version**: the positioning statement and the counts (projects, lines, repositories).
3. **Selected work** (`#projects`, "Six projects, in depth."): one interactive stage (`WorkStage.jsx`, `stage.css`). Tabs pick a project; the demo sits on the left and the short version on the right. saywhen plays its launch film (an animation, and the frame says so), Jarvis runs its real sample-data demo, Haloscript switches between its Mac, iPad and iPhone screenshots, and PRH-JEPA shows a report figure with a toggle for its headline finding. On small screens the projects stack.
4. **What the work covers** (`#capabilities`): agents and tooling, evaluation and research, product and shipping, each linked to the projects that show it.
5. **More work** (`#more`): four image cards, then a compact preview of the full index.
6. **Contact** (`#contact`): email first, then GitHub and LinkedIn.

**Design.** Cobalt & Stone: stone paper (`#f4f3ef`), obsidian ink (`#111318`), one cobalt (`#1d4ed8`, `#628cff` on dark). Two typefaces, Space Grotesk for display and IBM Plex Mono for everything else. Illustrations are dot-matrix prints (square dots on stone, one cobalt), redrawn by `scripts/dot-matrix-art.mjs`. The styles layer in this order: `index.css` (tokens), `editorial.css`, `showcase.css`, `stage.css`, and last `quiet-print.css`, which holds the current design and wins. `src/lib/palettes.js` names the palette per section; the swatch card (`PaletteSwatch.jsx`) shows on the dev server or with `?palette` in the URL. `src/lib/palettes.test.mjs` holds every pairing to AA contrast.

**Motion.** `MOTION.md` is the reference: the rules, the tokens in `src/lib/motion.js` (mirrored as CSS variables in `index.css`), and the reduced-motion policy.

Clicking a project opens `/work/<slug>/`: the story, a flow diagram, what I took from it, and links.

## URLs, scrolling and the build

- **Every view has a real URL** (`src/lib/routes.js`): the home page is `/` with its sections as `/#projects`, `/#contact` and so on; project pages are `/work/<slug>/`; the full index is `/work/`; the lineage explorer's live demo is `/playground/lineage-demo/`. Links are ordinary `<a href>`, and one click handler in `App.jsx` turns the in-app ones into history changes. The old hash links (`/#project/jarvis`) still open the right view and are rewritten to the new URL.
- **Each URL is a file.** After `vite build`, `scripts/prerender-routes.mjs` writes `dist/work/<slug>/index.html` (and the other views) with that page's own title, description, canonical URL and share image, plus a short static version of the page for readers that do not run scripts (hidden when scripts run, so the page does not jump). It also writes `404.html` and adds the pages to the sitemap.
- **The document scrolls**, not a box inside it, smoothed by Lenis on the pages that scroll (`src/lib/scroll.js`). Anything that scrolls the page from code goes through that file.
- **Fonts** are Space Grotesk and IBM Plex Mono from Google Fonts, linked in `index.html`.
- **Budgets.** `npm run check:budget` (run in CI after the build) fails when the first load or the shipped media grows past the limits in `scripts/check-budget.mjs`.
- **Media.** The launch film is H.264 at CRF 30.

`FABLE_REDESIGN_BRIEF.md` is the audit and the plan for the redesign this groundwork is for.

## The film

A first visit opens on a short film: the studio ident, then a 24-second trailer of three projects (Hedwig, saywhen, Haloscript) in hard jump cuts, then the page. "Watch the film" in the nav plays it again.

- **It is a rendered video**, made in the repo's `film/` folder with [Remotion](https://www.remotion.dev): `film/src/cuts.js` is the cut list (every shot, its length and the sound on its cut), `film/src/Film.jsx` the shots. `node render.mjs` there renders `public/film/film-wide.mp4` (1280×720) and `film-upright.mp4` (720×1280, for a phone held upright), their posters, and `src/film/filmCuts.json` (length and chapters, for the player). See `film/README.md`.
- **The player** (`src/film/FilmPlayer.jsx`) plays it full screen over the page with the controls bar (chapters on the timeline), Space, the arrows, M and Escape. It plays muted until the visitor's first tap wakes the sound. The ident, skip button and tap-for-sound badge are `components/FilmChrome.jsx`.
- It is skipped for reduced motion and on Save-Data or slow connections. Browser tests run in real Chrome (`channel: 'chrome'`), since Playwright's own Chromium cannot play H.264.
- **Sound** (`lib/sound.js`, the switch in the nav) is off by default and generated in the browser: an ambient pad that opens up with scroll speed, and the hits on the ident and the skip button. The film's soundtrack is recorded from the same engine (`film/score/record.mjs`).
- **Project data on the home page** comes from `src/data/projectIndex.js`, a generated slim copy of `projects.js` (titles, hooks, links, covers). After editing `projects.js`, run `node scripts/make-project-index.mjs`; a unit test fails if you forget.
- `rig.js` turns the shot list into a camera pose for any moment. It is plain maths with tests (`rig.test.mjs`), and it is the piece the real film reuses.

## Where things live

```
src/
  data/projects.js      every project (copy, flow diagram, links, screenshots)
  data/content.js       hero, receipts, about/skills, contact, command palette
  data/archive.js       the full index, grouped by kind of work
  data/hedwigRun.js     the recorded Hedwig run the hero replays
  components/
    Sections.jsx        hero + the home page sections
    ProjectPage.jsx     the per-project detail page
    ui.jsx              Rail (scroller), FlowDiagram, tags, section heading
    HedwigTrace.jsx     the hero's recorded model run
    WorkStage.jsx       the Selected work stage
    ProjectWorkPage.jsx the full index at /work/
    HedwigPage.jsx, HaloscriptPage.jsx  the two custom project pages
    DataLineageExplorer.jsx             the lineage demo
public/shots/           screenshots used on project pages
```

## Adding or changing a project

Edit `src/data/projects.js` for the full story. The home page order and its short copy live in `src/data/showcase.js`: `FLAGSHIPS` (the six spreads, with their headline, stats, stack and floating visual), `MORE_WORK` (the image cards), `CAPABILITIES` and `STACK_MARQUEE`. Any listed project not named there appears under "Also built". Flow diagrams are columns of boxes; boxes link to the next column automatically, or list `links` like `"0.0>1.1"` for a specific shape. Add images to `public/shots/` and list them under `shots`.

## Writing style

Plain words, first person, short sentences, no em dashes. Work projects stay generic: no employer, product, customer or retailer names, and no numbers.

## saywhen launch page

`public/p/saywhen/index.html` is a standalone page at `/p/saywhen/` with the 60-second launch film (`demo.mp4`, a re-encode of the film in the saywhen repository), its poster and the share image. `keyboard-museum.mp4` is the six-second film of a keyboard in a glass case. `who-its-for.mp4` is the eight-second home-then-office loop. Each has a `.jpg` poster. `real-run.mp4` is a real 23-second screen recording, cropped and silent, shown under the film. The survey figures stay in the page text. `public/p/saywhen/loops/` holds seven short silent loops (MP4, with a WebP still each) rendered from the saywhen repository's `docs/visuals/animated/`. They play only while on screen, and not at all for reduced motion or data saver. They are illustrations, not screen recordings. The saywhen README links to it, so keep the URL stable. `public/shots/spotlight/saywhen.webp` is the film's poster frame, an illustration and not a screenshot. `public/shots/saywhen/home-preview.webp` is the app in its browser demo mode.

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

## Studies, tools and skills

The studies (My Take on Jev, REA and PRH-JEPA) and the open-source tools and skills (Agent Flight Recorder, StoryEra, Site Recon, Exposure Audit) each sit on their own shelf in the builds list, with their own row, cover, story link and repository or report link.

StoryEra documents a continuity-audit workflow for novels. Site Recon documents and automates public website inspection, including stack evidence, exact browser-visible animation values, mobile and reduced-motion comparison, and clean-room rebuild guidance.

Agent Flight Recorder records agent actions and file changes locally, then ranks the edit most likely to explain a failed step. Its project page links the full case study, reproducible demo script and published package.

`public/shots/spotlight/storyera.webp`, `agent-flight-recorder.jpg`, and `exposure-audit.jpg` are original AI-generated editorial illustrations, not application screenshots. The prompts for the two newer covers are in [ARTWORK_PROMPTS.md](ARTWORK_PROMPTS.md). The two StoryEra diagrams in `public/shots/storyera/` come from the MIT-licensed StoryEra repository. `public/shots/spotlight/jarvis.webp` is also an editorial illustration, not a screenshot; the real Jarvis dashboard is shown in `public/shots/jarvis/dashboard.webp` and the demo at `/p/jarvis/demo/`.
