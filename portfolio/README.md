# Mohamed Ansar, portfolio

The source for [ansarbuilds.dev](https://ansarbuilds.dev).
React 19, Vite, Tailwind v4, Framer Motion, and three.js for the interactive experiments.

## How the site is laid out

A portfolio of agents, AI studies and shipped apps, with the proof for each. One scrolling page, then a detail page per project:

1. **Hero**: a dark stage with a turning network of nodes and travelling signals (`SignalField.jsx`). It tilts with the pointer, a click sends a burst of signals from the nearest node, and it fades and swells as the page scrolls on. The name decodes in, then one plain line, two actions, and a live strip of four flagship projects. The nav turns to dark glass while the hero is behind it, and the same network, dimmed, sits behind Contact.

   **Motion across the page** (all of it switches off for reduced motion, and the pointer effects never mount on touch screens):
   - `Cursor.jsx`: a ring that trails the pointer, swells over links, and becomes a labelled disc over anything tagged `data-cursor`.
   - `lib/pointerFx.js`: magnetic buttons (`{...magnetic}`) and the pointer spotlight helper.
   - On desktop the hero is pinned and the next section slides over it as a rounded sheet.
   - `ScrubText` lights the intro statement word by word as it scrolls in; `VelocityMarquee` takes its speed, direction and lean from the scroll; `Expand` widens dark sections from a rounded card to full bleed; `SplitTitle` raises flagship titles letter by letter.
2. **The short version**: the positioning statement, four counts, the lines-of-code band, and a moving row of the tools I build with.
3. **Selected work** (`#projects`): one interactive stage (`WorkStage.jsx`, `stage.css`) instead of six long sections. Tabs along the top pick a project; the demo sits on the left and the short version on the right. It moves on by itself until the visitor picks a tab. Jarvis runs its real sample-data demo in a frame, Haloscript switches between its own Mac, iPad and iPhone screenshots, PRH-JEPA shows a report figure with a toggle for its headline finding, and the Flight Recorder replay and Site Recon terminal are illustrations that say so. On small screens the tabs drop away and the six projects stack.
4. **What I bring** (`#capabilities`): agents and tooling, evaluation and research, product and shipping, each with the projects that prove it.
5. **More shipped work** (`#more`): image cards with one highlight each, then an "Also built" toggle for internal tools and early experiments.
6. **The playground** (`#ai`): the EMET terminal, solar system, and infinity loop.
7. **Contact** (`#contact`): email first, then GitHub and LinkedIn. Day jobs sit underneath as one quiet line (title and company only, `#experience`).

The whole site is one dark theme: carbon surfaces and bone text. Each later
section tints that base a few points toward its own accent
(`src/lib/palettes.js`): sections tagged `data-palette` swap the colour tokens
as they reach the middle of the screen, and the page eases between them. A
swatch card in the bottom-left corner (`src/components/PaletteSwatch.jsx`)
names the palette on screen and opens into its colours and hex codes.
`src/lib/palettes.test.mjs` holds every palette to AA contrast. `src/editorial.css` contains the homepage's layout and light/dark
surfaces. Shared compatibility tokens live in `src/index.css`. The main page uses
oversized condensed headings, illustrated covers using the original project
icons, flagship case-study spreads, an image grid, and a dark
interactive experiments section. The hero network pauses offscreen and in
hidden tabs, uses fewer nodes on phones, and draws one still frame for
reduced motion. The terminal and 3D scenes keep their own colors.

Clicking a project opens `#project/<slug>`: the story, a flow diagram, what I took from it, and links.

## Where things live

```
src/
  data/projects.js      every project (copy, flow diagram, links, screenshots)
  data/content.js       hero, roles, about/skills, EMET answers, command palette
  components/
    Sections.jsx        hero + the home page sections
    ProjectPage.jsx     the per-project detail page
    ui.jsx              Rail (scroller), FlowDiagram, tags, section heading
    EmetSection.jsx     the terminal
    SignalField.jsx      the hero's node network canvas
    NameParticles.jsx    the old particle name animation (no longer used)
    SolarSystemExplorer.jsx, DataLineageExplorer.jsx, InfinityLoop.jsx
public/shots/           screenshots used on project pages
```

## Adding or changing a project

Edit `src/data/projects.js` for the full story. The home page order and its short copy live in `src/data/showcase.js`: `FLAGSHIPS` (the six spreads, with their headline, stats, stack and floating visual), `MORE_WORK` (the image cards), `CAPABILITIES` and `STACK_MARQUEE`. Any listed project not named there appears under "Also built". Flow diagrams are columns of boxes; boxes link to the next column automatically, or list `links` like `"0.0>1.1"` for a specific shape. Add images to `public/shots/` and list them under `shots`.

## Writing style

Plain words, first person, short sentences, no em dashes. Work projects stay generic: no employer, product, customer or retailer names, and no numbers.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run lint
```

## Deploy

`.github/workflows/deploy-portfolio.yml` builds and publishes to GitHub Pages on every push to `main` that touches `portfolio/**`. Pages must be set to the **GitHub Actions** source.

## Emet answers

The terminal and edge chat share `src/emet/emetKnowledge.js`, including scored matching, short conversation context and follow-up suggestions. Without `VITE_EMET_AI_URL`, every answer stays local and deterministic. With the variable set, the same matched topic is sent as context to the separately deployed worker.

Questions the local matcher cannot answer are kept only in the visitor's session storage under `emet-unanswered-questions` (the latest 20) and emit an `emet:unanswered` browser event. Nothing sends those questions off-device. Connect analytics only with an explicit privacy decision and an updated visitor notice.

## Studies, tools and skills

The studies (My Take on Jev, REA and PRH-JEPA) and the open-source tools and skills (Agent Flight Recorder, StoryEra, Site Recon, Exposure Audit) each sit on their own shelf in the builds list, with their own row, cover, story link and repository or report link.

StoryEra documents a continuity-audit workflow for novels. Site Recon documents and automates public website inspection, including stack evidence, exact browser-visible animation values, mobile and reduced-motion comparison, and clean-room rebuild guidance.

Agent Flight Recorder records agent actions and file changes locally, then ranks the edit most likely to explain a failed step. Its project page links the full case study, reproducible demo script and published package.

`public/shots/spotlight/storyera.webp`, `agent-flight-recorder.jpg`, and `exposure-audit.jpg` are original AI-generated editorial illustrations, not application screenshots. The prompts for the two newer covers are in [ARTWORK_PROMPTS.md](ARTWORK_PROMPTS.md). The two StoryEra diagrams in `public/shots/storyera/` come from the MIT-licensed StoryEra repository. `public/shots/spotlight/jarvis.webp` is also an editorial illustration, not a screenshot; the real Jarvis dashboard is shown in `public/shots/jarvis/dashboard.webp` and the demo at `/p/jarvis/demo/`.
