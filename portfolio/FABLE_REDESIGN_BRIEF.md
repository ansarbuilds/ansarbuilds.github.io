# Portfolio audit + redesign brief (for Fable 5.2)

Repo: `ansarbuilds/ansarbuilds.github.io`, folder `portfolio/` → ansarbuilds.dev (GitHub Pages via `.github/workflows/deploy-portfolio.yml`).
Audited 2026-11-16 at `main` HEAD. Build passes (`vite build`, 1.4s), `oxlint` clean.

---

## 1. What exists today

| Area | State |
| --- | --- |
| Stack | React 19, Vite 8, Tailwind v4, Framer Motion 13, three.js 0.185, lucide-react |
| Size | ~17k lines in `src/` (projects.js alone 2,175) |
| Routing | Hash routes (`#project/<slug>`) inside `App.jsx` (545 lines, 8 hand-rolled route `motion.div`s) |
| Home | Hero (`SignalField.jsx` canvas graph) → short version → `WorkStage` (7 tabbed projects) → capabilities → more work → playground (EMET terminal, solar system, infinity loop) → contact |
| 3D | Solar system, InfinityLoop, DigitalDouble (GLB), BB-8 companion (roaming robot), all lazy-loaded |
| Motion system | Tokens in `src/lib/motion.js` + CSS vars; rules in `MOTION.md`; measurements in `motion-audit/AUDIT.md` |
| Theme | Single dark theme; per-section palette swaps (`lib/palettes.js`) with AA tests |
| Tests | node tests for EMET/BB-8/palettes, Playwright smoke + axe |

**Keep:** the content (`data/projects.js`, `showcase.js`, `content.js`), the motion token idea, the reduced-motion discipline, palette contrast tests, EMET knowledge + worker, lazy-loading of 3D.

---

## 2. Findings (ranked)

### Performance / payload
1. **Media weight: 31 MB in `public/p/saywhen/`** (`demo.mp4` 23 MB, `who-its-for.mp4` 4.3 MB). Re-encode to H.264/AV1 at ~2–4 MB, add `poster`, `preload="none"`, serve a WebM/AV1 + MP4 pair.
2. **`digital_double.glb` is 7.9 MB.** Run `gltf-transform optimize --compress meshopt --texture-compress webp` → expect ~1 MB. Load with `MeshoptDecoder`.
3. **`public/shots/` is 12 MB.** `lineage.png`, `digital-double.jpg` should be AVIF/WebP with `srcset` sizes.
4. **JS shipped up front: ~333 KB gzip** (index 109 + react 57 + motion 47 + css 25; three 163 KB loads when a 3D piece mounts). The main chunk is 328 KB raw because every section and `projects.js` is eager. Code-split project pages and the playground; move project copy to JSON fetched per route.
5. **Six Google font families** (Outfit, Bricolage, Plus Jakarta, Instrument Serif, Anton, JetBrains Mono), only ~4 CSS roles use them. Cut to 2–3, self-host as variable woff2, preload the display face.
6. Framer Motion (47 KB gz) duplicates what CSS + a tiny scroll lib could do. Fine to keep if the redesign leans on layout animations; otherwise replace with `motion` mini or GSAP.

### Code health
7. **~300 lines of dead CSS** (`.sc-flag`, `.sc-split`, `.ed-feature`, etc.) and 8 dead keyframes, already listed in `motion-audit/AUDIT.md`. `.sc-card-media` defined 4× in `showcase.css`.
8. **Four global stylesheets** (`index`, `editorial`, `showcase`, `stage` = 1,450 lines, 132 KB built) layered on top of Tailwind. Two systems fighting. Pick one: Tailwind + tokens, or CSS modules.
9. `NameParticles.jsx` (362 lines) is unused; README says so. Delete.
10. `App.jsx` does routing, transitions, palettes, sandbox, scroll context. Split into a router + layout shell.
11. Page scrolls inside `<main>` instead of the document: breaks IntersectionObserver margins (AUDIT #2), native scroll restoration, and smooth-scroll libs. **Fix this before adding any scroll-driven motion.**
12. Hash routing hurts SEO/share previews per project. Pre-render static routes (`/work/<slug>/`) at build time.

### Design / motion (from the existing motion audit, still open)
13. 67 distinct durations, 14 easings in CSS; tokens exist but aren't enforced.
14. Intro curtain (510 ms) reads as a glitch; nothing carries into the hero.
15. Route transitions are 0.12 s opacity fades, no shared element card → page.
16. `DecodeLine` calls `setState` every rAF frame.
17. Cursor lerp is frame-rate dependent; magnetic buttons feel rubbery.
18. Playground CTAs ~1.1:1 contrast (`editorial.css:150`, `--ed-ivory` became dark).
19. BB-8 can roam over the footer/"Back to top".

---

## 3. Redesign brief for Fable 5.2

Paste this section to Fable as the task.

> Redesign `portfolio/` in this repo into a studio-grade site. Keep all copy and facts from `src/data/*` (house style: plain words, first person, no em dashes, no employer names). Keep GitHub Pages deploy, Vite, React 19.
>
> **Phase 0 – foundation (no visuals yet)**
> - Document-level scrolling (remove `<main>` scroller). Add Lenis for smooth scroll.
> - Real routes `/`, `/work/:slug`, `/playground` with static pre-render (vite-ssg or a prerender plugin) so each project has its own OG tags.
> - One styling system: Tailwind v4 + design tokens (`@theme`). Delete `editorial.css`, `showcase.css`, `stage.css`, `NameParticles.jsx`, dead keyframes.
> - Self-host 2 fonts: one display (variable, e.g. a grotesk with optical size) + one mono.
> - Media pipeline: AVIF/WebP + srcset, videos ≤4 MB with posters, GLB via gltf-transform + meshopt.
> - Budgets enforced in CI: initial JS ≤150 KB gz, LCP ≤2.0 s on Moto G4 / 4G, CLS ≤0.05, 60 fps scroll at 4× CPU throttle.
>
> **Phase 1 – the signature hero (WebGL)**
> - One persistent full-screen `<canvas>` (react-three-fiber + drei) behind the DOM, shared across routes so scenes morph instead of reload.
> - Hero: a GPU particle / instanced "agent graph" (evolve `SignalField` concept) built with custom GLSL: curl-noise flow, pointer-reactive attraction, bloom + film grain + chromatic aberration via `postprocessing`. Name set in large display type, split per character, revealed with masked staggers on one GSAP timeline.
> - Fallback: static poster image for `prefers-reduced-motion`, low-power, and no-WebGL.
>
> **Phase 2 – scroll choreography**
> - GSAP ScrollTrigger (or Framer `useScroll`) pinned sections: work stage becomes a horizontal pinned reel; each project card is a WebGL plane with a distortion shader on hover/scroll velocity.
> - Shared-element transition card → project page (View Transitions API with Framer fallback).
> - Section palette shifts kept (`lib/palettes.js`) but driven by the same scroll timeline and fed into the WebGL scene's uniforms.
>
> **Phase 3 – playground as a showpiece**
> - Solar system, infinity loop, digital double, BB-8 rendered in the shared canvas as switchable "scenes", with HDRI lighting, PBR materials, soft shadows.
> - EMET terminal stays DOM, styled as a glass panel over the scene.
>
> **Phase 4 – polish**
> - Custom cursor with frame-rate-independent damping (`1 - exp(-k*dt)`), magnetic CTAs via springs.
> - Sound design optional, off by default.
> - Motion tokens enforced: lint rule or test that rejects raw durations/cubic-beziers outside `lib/motion.js`.
> - Accessibility: axe clean, full keyboard nav, focus rings, reduced-motion respected everywhere, AA contrast tests kept.
>
> **Deliver per phase as separate PRs**, with Playwright before/after videos (reuse `motion-audit/record.mjs`) and Lighthouse numbers in each PR description.

### Suggested dependencies
`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `gsap` (+ ScrollTrigger, SplitText — free since 2025), `lenis`, `@gltf-transform/cli` (dev), `vite-plugin-image-optimizer` or `sharp` (dev), a prerender plugin.

### Reference bar
Award-site tier (Awwwards SOTD style): one bold WebGL idea, restrained typography, choreographed scroll, fast. Polish and performance sell "100k", not more effects.

---

# 4. CINEMATIC DIRECTION (this replaces the "Phase 1–4" visuals above; Phase 0 still applies)

> Fable: this is not a portfolio template. Treat the site as a **feature film the visitor directs by scrolling**. Every section is a scene, every transition is a cut, every hover is a performance. Budget is unlimited; the only constraints are 60 fps, accessibility, and the facts in `src/data/*`.

## 4.1 The concept: "Signal"
One continuous world. The visitor starts in darkness and follows a single point of light (the "signal", already the hero idea in `SignalField.jsx`) as it grows into a network, a machine, a universe. Every project is a place the signal visits. The camera never stops; there are no page loads, only camera moves.

- **One persistent WebGL world** (react-three-fiber), one camera, one timeline. DOM text is composited over it like film titles.
- **Scroll = playhead.** A master GSAP timeline mapped to scroll (Lenis smoothing). Scenes are acts on that timeline, not separate components.
- **Visual language:** anamorphic. 2.39:1 letterbox bars that open and close between acts, lens flares on bright nodes, film grain, slight chromatic aberration at frame edges, depth of field that racks focus between text and 3D, cinematic color grade via a 3D LUT per act.
- **Typography as title design:** one huge display face, kinetic. Titles are built like opening credits (Saul Bass / Se7en / modern Marvel-style main-on-ends): letters assembled from particles, masked by light, extruded in 3D when the camera passes them.

## 4.2 Storyboard (shot list)

**COLD OPEN — 0:00 to 0:08 (plays on load, skippable, once per visit)**
1. Black. A soft low hum (audio off by default; a "sound on" pill in the corner, like a trailer).
2. A single pixel of light ignites center frame. Lens flare blooms. Letterbox bars visible.
3. The point pulses with a heartbeat; each beat spawns faint lines, the first nodes of a graph.
4. Camera pulls back fast (dolly-out with motion blur) revealing thousands of nodes: an agent network shaped like a nebula.
5. Signals race along edges and converge; particles assemble into the name **MOHAMED ANSAR** in 3D type, lit from behind (god rays).
6. Hard cut to silence. Subtitle types in mono: "I build agents, studies and apps. With proof."
7. Letterbox bars slide away, the frame opens to full screen = the hero. The nav fades in. Total ≤8 s; second visit: 1.5 s version.

**ACT I — THE SHORT VERSION**
- Camera flies *through* the name into the network. The four counts are physical objects in space: numbers made of instanced glowing cubes that count up as the camera passes. Lines-of-code band = a data river flowing under the camera.
- Tool logos orbit like satellites; hovering one pulls it toward camera with a spring.

**ACT II — SELECTED WORK (the 7 flagships, each a mini-film, ~1 viewport of scroll each, pinned)**
Each project gets its own *set*, lighting and grade; the camera travels between sets along the signal path. Title card per project in the credits style, then the real demo media composited onto a 3D screen inside the scene.
- **saywhen** — a dark room, a floating monitor. A face-shaped point cloud turns toward it; a waveform rises from the "mouth" and becomes text that types onto the screen. The launch film plays on that monitor.
- **Jarvis** — a control room at night. Holographic panels of the dashboard orbit a core; a budget gauge ("20 calls/day") glows like a reactor limit.
- **Agent Flight Recorder** — an aircraft black box in an orange spotlight, slowly exploding into its layers (tool calls, edits, failure); the "suspect edit" layer flashes red and flies to camera.
- **PRH-JEPA** — two point clouds (images, text) drifting apart, then snapping into alignment with a single rotation; the hidden "−35%" is revealed by a light sweeping across, like a forensic scene.
- **Haloscript / others** — devices (Mac, iPad, iPhone) as real PBR models with screens playing the actual screenshots, rotating on a turntable with studio lighting.
- Transition between projects: the signal streaks across as a light-speed tunnel (radial blur, 0.6 s), never a fade.

**ACT III — WHAT I BRING**
- Three pillars rise from the ground as monoliths (agents, research, shipping). Camera orbits each; project names are etched and light up when relevant.

**ACT IV — THE PLAYGROUND (the "VFX reel")**
- The network collapses into a star. Camera passes into the solar system (existing explorer, upgraded with HDRI, atmospheric scattering, bloom). The infinity loop is a ribbon of light the camera rides. The digital double stands in a volumetric spotlight. BB-8 rolls into frame as a *character* who reacts to the cursor.
- EMET terminal: a glass HUD over the scene, voice-of-the-film narrator.

**FINALE — CONTACT**
- Everything the visitor saw recedes into a single point again (bookend to the cold open). Black. "Let's build something." in the title face. Email button glows like the original signal. Credits-style footer rolling up: stack, tools, "Directed by Mohamed Ansar".

**PROJECT PAGES**
- Click a card: camera dives *into* that project's set (shared-element: the 3D screen becomes the page header). Back: camera pulls back out to the exact spot on the timeline.

## 4.3 Production pipeline (how a "Hollywood" result is actually made)
1. **Pre-vis first.** Before code, produce a storyboard page (`/storyboard`, dev only) with one frame per shot and timing. Get approval, then build.
2. **3D assets without Blender.** Build sets procedurally in code (three.js geometry, instancing, SDF/raymarched shapes, shaders) and use CC0 glTF models (Poly Haven, Kenney, Sketchfab CC0) plus Poly Haven HDRIs. Bake AO/lighting at runtime where needed; compress glTF with gltf-transform (meshopt + KTX2). Target ≤3 MB total 3D on first act; stream later acts.
3. **Shaders:** custom GLSL for particles (GPGPU / FBO simulation, 250k+ particles on desktop, 30k on mobile), curl noise, volumetric light, raymarched nebula, light-speed tunnel.
4. **Post stack:** `postprocessing` — bloom, DOF, chromatic aberration, noise, vignette, LUT, motion blur, SMAA.
5. **Sound design:** layered ambient score + whooshes on cuts + UI ticks via WebAudio, muted until opted in, ducked on reduced motion.
6. **Camera:** spline camera paths authored in Theatre.js (`@theatre/core` + `@theatre/r3f`) so shots are keyframed like a film editor, not hand-coded. Export the state JSON; scroll drives the sequence position.
7. **Quality tiers:** detect GPU (`detect-gpu`) → Ultra / High / Mobile / Static. Static tier = pre-rendered video loops and posters so phones still feel cinematic.
8. **Accessibility:** "Skip intro", "Reduce motion" = cuts instead of camera moves, all copy available as real DOM text, keyboard path through every act.

## 4.4 Extra dependencies for this direction
`@theatre/core`, `@theatre/r3f`, `@theatre/studio` (dev), `detect-gpu`, `maath`, `three-stdlib`, `troika-three-text` (3D type), `howler` or raw WebAudio, `@react-three/postprocessing`, `gsap` (ScrollTrigger, SplitText), `lenis`.

## 4.5 How to run this with Fable
Do not give it all at once. One session per step, in order, each ending in a PR with a recorded video:
1. Phase 0 foundation (section 3).
2. Pre-vis storyboard page + Theatre.js camera rig + empty world.
3. Cold open.
4. Act I.
5. Act II, one project per PR (7 PRs).
6. Acts III–IV, finale, project-page dives.
7. Sound, quality tiers, accessibility, performance pass.

Review each video before approving the next step; that is the "director's" job.

---

# 5. Status

## Phase 0, foundation: done in the `phase-0-foundation` PR

| Item | Result |
| --- | --- |
| Document scrolling + Lenis | Done. `src/lib/scroll.js`. Full-screen views are not smoothed. |
| Real routes, pre-rendered | Done. `/work/<slug>/`, `/work/`, `/playground/<id>/`; 41 pages written by `scripts/prerender-routes.mjs`, plus `404.html`. Old hash links redirect. |
| Media | `demo.mp4` 24.1 → 6.4 MB, `digital_double.glb` 8.3 → 3.1 MB, unused `who-its-for.mp4` removed. `public/` 54 → 27 MB. |
| Fonts | Self-hosted, 6 families → 5 (Bricolage dropped). No request to Google Fonts. |
| Dead code | 31 unused CSS classes, 4 keyframes and `NameParticles.jsx` removed. |
| First-load JS | 219 → 191 kB gzip (project pages, Emet and the sandbox load on demand). |
| CI budgets | `npm run check:budget` in `checks.yml`. |

## Left for later steps, on purpose

- **One styling system and two fonts.** The four stylesheets and five families are the current look. Porting them to Tailwind or cutting to two fonts now would mean redesigning the site before the new design exists, so they are replaced act by act as the cinematic build lands.
- **First-load JS at 150 kB.** Needs `data/projects.js` (178 kB raw) split into a small index for the home page and per-project detail, and Framer Motion (47 kB) retired as GSAP takes over.
- **The film at 4 MB.** A 60-second 1080p film with sound does not get there without visible loss. It only loads on play, so it does not affect page load.
- **AVIF and srcset.** Images are already mostly WebP and small (largest 464 kB); a responsive image pipeline belongs with the new project scenes.

## Step 2, storyboard and camera rig: done in the `step-2-storyboard-previs` PR

- `src/film/shots.js`: 33 shots across the cold open, four acts, the finale and the project-page dive. 1 min 35 s at playing speed, 19.3 screens of scrolling.
- `/storyboard/` and `/previs/`, on the dev server only. A production build has neither the routes nor the code.
- `src/film/rig.js`: the camera rig, with tests.
- React Three Fiber 9 is in, and only loads with the pre-vis for now.

**Change from the plan: no Theatre.js.** Its React bindings need React 18 and React Three Fiber 8, and it has had no release since May 2024; this site is on React 19. The camera is keyframed in `shots.js` instead, which also keeps the storyboard and the camera on one source.

**Act II has six sets, not seven.** The home page has six flagship projects; the brief miscounted.

**Before step 3 (the cold open):** review the storyboard and say which shots to change.

## Step 3, cold open: done in the `step-3-cold-open` PR

- Shots CO-01 to CO-07 as built: the signal and its lens flare, two heartbeats, the pull back through a 64,000-particle network (24,000 on phones), the network forming the name with light rays behind it, the typed line, and the frame opening onto the real hero.
- It is a layer over the real page, not a separate page. The particle name is built on top of the hero's own name, so the hand-over has no jump.
- Plays once per session. A returning visitor gets a 1.5 s cut from the name onward. Skippable by any click, key, scroll or the Skip button.
- 60 fps on an M4 at 1440x900 and on a phone-sized screen.
- **Cost:** Lighthouse (first visit, slow phone and network) goes from 86 to 43 and 72 over two runs, and the hero name from 3.4 s to 5.1 s. three.js (171 kB) and the shaders load only for a visitor who sees the film.

## Step 4, Act I: done in the `step-4-act-one` PR

- Shots A1-01 to A1-03, scroll-driven, replacing the "short version" sheet: through the name (it parts for the camera), the four numbers counting up in cubes with their labels, a river of code under the path, and the tools orbiting; pointing at one pulls it toward the camera.
- The numbers land while still well in frame and fade before the camera reaches them. On phones they stand nearly on the path, smaller.
- Statement, numbers and tools stay real text. Reduced motion, Save-Data, slow connections and no WebGL 2 get the plain section, as does a scene that fails to start.
- 60 fps on an M4. The scene (6 kB plus three.js) loads as the sheet starts to slide up. First-load JS +0.8 kB.

## Step 5a, Act II framework and saywhen: done in the `step-5-act-two-saywhen` PR

- The Act II framework: per project, a cut into a light-speed streak, the arrival (title card, letterbox), and the scene with a card of real text and links. It sits above the interactive work stage, which stays as the hands-on version.
- The saywhen set: a dark room, a monitor playing the real app loop, the digital double's head as 8,000 points turning to it, a voice waveform from its mouth to the screen, and `cargo test --release` typed and sent.
- Next: one PR per remaining set, in order: Jarvis (done in `step-5b-act-two-jarvis`), Flight Recorder (done in `step-5c-act-two-flight-recorder`), PRH-JEPA (done in `step-5d-act-two-prh-jepa`), Haloscript (done in `step-5e-act-two-haloscript`), Digital double (done in `step-5f-act-two-digital-double`). Act II is complete.
- Open question for when all six are in: keep the work stage below the film, or fold it into the cards.

## Step 5b, the Jarvis set: done in the `step-5b-act-two-jarvis` PR

- A control room at night: the real dashboard screens (sample data) orbit a core of points, the agents (Scout, Builder, Recruiter, Ticker) circle it, and a gauge counts the day's AI calls to the hard cap of 20, where the core strains and the gauge glows orange.
- Cards now say what their screens are ("Screens: the real dashboard, sample data"; "Screen: the launch animation").

## Step 5c, the Flight Recorder set: done in the `step-5c-act-two-flight-recorder` PR

- An orange black box under a real spotlight comes apart into one layer per recorded step, from the home page's illustrated run (read, edit, run, failure, suspect, evidence). The failure layer lights red; the suspect edit flashes and flies to the camera with its diff. The card says "Illustration of a recorded run".

## Step 5d, the PRH-JEPA set: done in the `step-5d-act-two-prh-jepa` PR

- Two clouds of points, images and text, drift apart with lines between matching points; one rotation snaps them together; a light sweeps across and turns exactly 35% of the points red, and "−35%" comes up: of the top score came from a hidden clip. The card says "Illustration of the finding".
- On phones every Act II set now stands in the upper part of the frame, above its card.

## Step 5e, the Haloscript set: done in the `step-5e-act-two-haloscript` PR

- A MacBook, an iPad and an iPhone, modelled in code with metal reflections from a studio environment map, on a turntable under a key light and a violet rim. Their screens are the real app and move through it together: the manuscript, the whiteboard, the corkboard.
- The screenshots (about 1 MB) load while the PRH-JEPA set is on screen, not with the rest of the act.
- The dev server now prepares the film's lazily loaded three.js modules at start (`optimizeDeps` in `vite.config.js`). Finding one on first use reloaded every open page, which made browser tests flaky.

## Step 5f, the Digital double set: done in the `step-5f-act-two-digital-double` PR

- The real model (3 MB, fetched while Haloscript plays) stands in a cone of light and looks at the visitor: the head leans toward the pointer and the eyes aim at it, wandering when there is no pointer. On phones the same head as points (56 kB). Its build stages hang behind it as a contact sheet with their verdicts; the shipped stage lights.
- Fix across every set: cards, panels and labels now face the camera from its world position (`faceCamera` in `kit.js`). Before, they were aimed at a point in the set's local space and only faced the camera roughly.
- The stages list moved to `src/data/digitalDouble.js`, shared by the model's page and the film.

**Act II is complete.** Decision: the hands-on work stage stays below the film as the "try it" part (tabs, the live Jarvis demo, the saywhen film with sound).

## Step 6, Act III: done in the `step-6-act-three` PR

- "What I bring" becomes three monoliths of carved stone, one per capability (agents, research, shipping), each cut with its number, title and proof projects. They rise out of the ground under the title card; the camera then circles them on a true arc between the storyboard's two cameras, and each one's carving glows as it turns to face the camera, with a card of its real text and links.
- The section keeps `id="capabilities"`, so the nav link still lands on it. Where the film is off, or the scene fails, the plain section is shown.
- Storyboard change: A3-02 ends further back (radius 40, higher), so the last monolith's carving stays in frame.

## Step 7, Act IV: done in the `step-7-act-four` PR

- The playground returns to the home page as a reel between More work and Contact (`id="ai"`): the network collapses into a star that becomes the sun, the planets come in on their real orbits, an infinity ribbon of light with a bright head running round it, and Emet's terminal answering "who are you?" in its own words. Each scene's card opens the real experiment. Without the film the home page has no playground section, as before.
- Storyboard change: A4-04 is Emet's terminal, not "the head and BB-8": the head has its scene in Act II, and Emet is the droid that already roams the page. A4-01 now happens at the solar system's sun.
- Performance, all acts: no backdrop blur on cards over a moving canvas, and an act that has finished (or not started) draws a quarter of the frames. Both cut dropped frames to about none where two scenes are on screen at once.
