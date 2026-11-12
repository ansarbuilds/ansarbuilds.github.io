# Motion audit

Phase 0 of the motion pass. Nothing in `src/` was changed to produce this.
Audited at commit `2d309c23` (main, after PR 207), on 2026-11-10.

## How this was produced

- `motion-audit/record.mjs before` recorded the baseline with the local Chrome
  through Playwright: four flows at 1440x900 and 390x844, eight videos in
  `motion-audit/before/`.
- `motion-audit/measure.mjs` produced every number quoted below.
- The rest is read from the source, with file and line given.

| Video | What it shows |
| --- | --- |
| `desktop-first-load.webm`, `mobile-first-load.webm` | A first visit with empty storage, so the intro plays |
| `desktop-home-scroll.webm`, `mobile-home-scroll.webm` | The whole home page, top to bottom, at reading pace |
| `desktop-project-open-close.webm`, `mobile-project-open-close.webm` | Card to project page, a short scroll, then back |
| `desktop-stage-tabs.webm`, `mobile-stage-tabs.webm` | All six WorkStage tabs (stacked panels on mobile) |

## Baseline numbers

| Measure | Value |
| --- | --- |
| Home page length at 1440x900 | 7,845px, 8.7 viewports |
| Intro curtain on screen | 510ms (first seen at 279ms, gone at 789ms after navigation) |
| Full home scroll, 4x CPU throttle | 54.2fps average |
| Frame time, same run | p50 17.1ms, p95 23.7ms, p99 40.2ms |
| Frames over 33ms / over 50ms | 7 / 2 of 463 |
| Long tasks over 50ms | 1, the longest 117ms |
| Canvases alive on the home page | 2 (hero and contact) |
| `@keyframes` across the CSS | 33 (stage 8, showcase 11, index 6, editorial 4, BB-8 4) |
| Distinct durations in CSS transitions and animations | 67 |
| Distinct easing functions in CSS | 14 |

## The nine reported problems, checked

| # | Claim | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | No single motion language | **True** | 67 distinct durations and 14 easing functions in CSS. `EASE_OUT`, `EASE_REVEAL`, `CURTAIN_EASE` in JS plus `--ease-out`, `--ease-reveal`, `--ease-spring` and four raw `cubic-bezier`s in CSS. The spring presets in `motion.js` are imported only by `EmetSection.jsx`. `.sc-card-media` is defined **four** times in `showcase.css` (L122, L389, L440, L471), each overriding the last. |
| 2 | Reveals are timid and happen offscreen | **Half true** | `Sections.jsx:24`: 12px, 0.3s, delay clamped to 60ms, so staggers do flatten. The `20%` margin does **not** fire early in practice: the page scrolls inside `<main>`, which clips the observer, so the margin is ignored (0 of 17 watched reveals fired below the fold). They fire at the first visible pixel, on the bottom edge of the screen, which is still too early to be seen. |
| 3 | The intro curtain reads as a glitch | **True, numbers differ** | It is on screen for 510ms, not gone by 120ms. That is still too short to read as intent: `IntroCurtain.jsx:16-17` (140ms hold, 0.3s lift), letters 6ms apart (L51). Nothing carries from it to the hero. |
| 4 | Route transitions are cheap and copy-pasted | **True** | `App.jsx:358-459`: eight `motion.div`s, seven at 0.12 to 0.14s opacity, one at 0.3s with 14px. `AnimatePresence mode="wait"`. No shared element between a card and its page. |
| 5 | Too much ambient noise | **Mostly true** | See the ambient table below. Two details in the report are already gone: the name sheen and the kicker pulse were switched off in PR 207 (`showcase.css:516-517`), and the feed's status dots do not pulse. The feed scan, the timer bar, the 2.6s rotation, the hint, the paper grain and the rest are live. |
| 6 | DecodeLine re-renders every frame | **True** | `Sections.jsx:73`: `setShown` inside a `requestAnimationFrame` loop, twice (one per line of the name). |
| 7 | Cursor is frame-rate dependent, magnets are rubbery | **True** | `Cursor.jsx:20-21`: `x += (tx - x) * 0.2` per frame. `pointerFx.js:21`: strength 0.28 / 0.38. `showcase.css:340`: a 0.45s CSS transition on `translate` while the pointer moves. |
| 8 | Hard-coded pixels, costly Expand, ScrubText fight | **True** | `Sections.jsx:143-148`: `[0, 800]`, `[0, 560]`, `[80, 620]`, `[0, 900]`. `Sections.jsx:227`: `clip-path: inset(... round ...)` rebuilt as a string every scroll frame, with `will-change: clip-path` (`showcase.css:367`). `showcase.css:355`: a 0.12s CSS opacity transition on the same spans Framer drives. |
| 9 | Playground CTAs nearly invisible, BB-8 over "Back to top" | **First true, second not reproduced** | The CTAs are a colour bug, not a reveal bug: `editorial.css:150` sets `color: var(--ed-ivory)`, which became the dark surface when the site went dark. Measured contrast against the section is about 1.1 to 1. BB-8 did not overlap "Back to top" in the measured run. It roams, so the overlap is intermittent, and nothing in the code prevents it (the avoid list in `BB8Companion.jsx` does not include the footer). |

## Things the report did not list

1. **About 300 lines of dead motion CSS.** The six long project spreads were
   replaced by the stage, but their styles are still shipped: `.sc-flag`,
   `.sc-split`, `.sc-badge`, `.sc-rail`, `.sc-jump`, `.sc-float`, `.sc-term`,
   `.sc-art`, `.sc-visual`, `.sc-index` in `showcase.css`, and `.ed-feature`,
   `.ed-open-source`, `.ed-project-tile`, `.ed-role`, `.ed-skill`, `.ed-about`
   in `editorial.css`. No JSX uses any of them. Eight keyframes are dead or
   switched off with them: `sc-marquee`, `sc-pulse`, `sc-glow`, `sc-sheen`,
   `sc-spin`, `sc-rise`, `sc-line` and `st-beckon`.
2. **The paper grain does nothing visible.** It is a `multiply` blend of dark
   dots (`editorial.css:495`). On the dark theme that multiplies dark onto
   dark. It still repaints the whole viewport every 0.72s.
3. **Palette changes restyle the whole page.** `editorial.css:11` transitions
   six registered colour properties on `:root` for 0.9s, so every element
   that inherits them restyles each frame of the fade. The file's own comment
   says so. With one dark theme the visible change is small and the cost is
   the same.
4. **The hero graph is the loudest thing on the page.** It changes shape
   every 6.9s (`SignalField.jsx:79-80`), spins, runs up to 26 signals, drifts
   90 dust specks and puts a halo on every near node. That is five ambient
   layers in one canvas, behind a name, a feed and a hint.
5. **Two counters.** `CountUp` (`Sections.jsx:29`, starts at 60%, 0.7 to 1.4s,
   `EASE_REVEAL`) and `StatValue` (`WorkStage.jsx:56`, starts at 0, 0.6s,
   `EASE_OUT`) do the same job two ways.
6. **Stage timers.** `useAutoStep` (`WorkStage.jsx:39`) and the hero feed
   (`Sections.jsx:93`) both run `setInterval`. Both do stop off screen and in
   a hidden tab.
7. **Width and height are animated** by the cursor ring (`showcase.css:331`),
   against the "transform and opacity only" rule the last pass set.
8. **Reveal systems overlap.** A heading is revealed by Framer (`Enter`: 12px
   and opacity on the wrapper) and by CSS at the same time (`showcase.css:277`:
   clip-path and 46px on the `h2`, then the `em`, then the aside).
9. **Mobile.** The eight-viewport page is far longer on a phone, and the
   stacked stage runs six demos' timers at once whenever it is on screen.

## Inventory

Verdicts: **keep** (fine as it is), **fix** (keep the idea, rebuild on the
motion system), **cut** (remove).

### Page load and routes

| Where | What it does | Trigger | Duration | Easing | Verdict |
| --- | --- | --- | --- | --- | --- |
| `IntroCurtain.jsx:16-68` | Name rises letter by letter, hairline draws, curtain lifts | First visit | 140ms hold, 0.3s lift, letters 0.2s at 6ms apart | `CURTAIN_EASE`, `EASE_REVEAL` | **fix**: rebuild as a real handoff into the hero name, or cut |
| `App.jsx:358-459` | Eight route wrappers fade | Hash change | 0.12 to 0.14s, one 0.3s | `EASE_OUT` | **fix**: one `RouteTransition`, with card to page continuity |
| `App.jsx:69, 150` | Smooth scroll to a section or the top | Nav click | Browser default | Browser | **keep** |
| `App.jsx:245` ScrollProgress | Top bar tracks scroll | Scroll | Per frame, rAF batched | none | **keep** |
| `App.jsx:283` + `editorial.css:11` | Palette tokens ease between sections | Scroll | 0.9s (0.3s coarse pointers) | `--ease-out` | **fix**: shorten, or apply without a transition |
| `index.css:375` route-loader-spin | Spinner while a lazy route loads | Route load | loop | linear | **keep** |

### Hero

| Where | What it does | Trigger | Duration | Easing | Verdict |
| --- | --- | --- | --- | --- | --- |
| `SignalField.jsx:79-81` | Graph warps in, then changes shape forever | Load, then every 6.9s | 1.2s warp, 1.7s morph, 5.2s hold | custom smoothstep | **fix**: keep one calm shape as the hero's single ambient layer; decide the shape-shifting below |
| `SignalField.jsx:108` | 90 dust specks drift | Always | loop | linear | **cut** |
| `SignalField.jsx:168` | Graph spins when not the layered shape | Always | loop | linear | **cut** with the shape-shifting |
| `SignalField.jsx` signals and flares | Signals run the wires, nodes flare | Always | loop | linear | **keep**, at a lower count |
| `SignalField.jsx:87-88` | Click burst, shockwave and label | Click | 1.2s label | linear | **keep** (it is an answer to an action, not ambient) |
| `Sections.jsx:57-83` DecodeLine | Name scrambles through glyphs | Load, and each time the hero re-enters view | about 0.6s | none | **cut**: replace with a masked line reveal |
| `Sections.jsx:151-155` | Kicker, line, buttons fade up | Load | 0.45s each | `EASE_OUT` | **fix**: one timeline |
| `Sections.jsx:87-106` HeroFeed | Cards rise, then one lights up in turn | Load, then every 2.6s | 0.45s rise, 70ms apart | `EASE_OUT` | **fix**: keep the rise; slow or stop the rotation |
| `showcase.css:234-236` feed scan | Light sweeps the active card | Every 2.6s | 1.5s | `--ease-out` | **cut** |
| `showcase.css:272-274` feed timer | Bar fills on the active card | Every 2.6s | 2.6s | linear | **cut** |
| `showcase.css:266` hero spot | Soft light follows the pointer | Pointer move | instant | none | **cut** (a second pointer effect over the canvas tilt) |
| `showcase.css:207` hero grid | Static grid behind the canvas | none | none | none | **keep** (it does not move) |
| `showcase.css:269` hint | "Click the network" | Always shown | none | none | **fix**: show after idle, or cut |
| `Sections.jsx:143-148` | Copy lifts and fades, graph swells on scroll | Scroll | scrubbed over fixed pixels | linear | **fix**: base on viewport height |
| `showcase.css` `.sc-open` sheet | Next section slides over the pinned hero | Scroll | scrubbed | none | **keep**: this is the hero's exit |

### Section reveals

| Where | What it does | Trigger | Duration | Easing | Verdict |
| --- | --- | --- | --- | --- | --- |
| `Sections.jsx:20-25` Enter | 12px rise and fade | First pixel in view | 0.3s, delay clamped to 60ms | `EASE_REVEAL` | **fix**: fire at about 30% visible, real staggers |
| `showcase.css:277-282, 518-520` | Heading rises from a mask, serif line, then aside | `.is-in` from Enter | 0.6s, 0.5s, 0.45s | `--ease-out` | **fix**: one heading pattern from the motion system |
| `Sections.jsx:117-130` ScrubText | Statement lights word by word | Scroll | scrubbed | linear | **fix**: drop the CSS transition (`showcase.css:355`) |
| `Sections.jsx:190-218` VelocityMarquee | Tool strip drifts, speeds and skews with scroll | Always, scroll | loop | spring 400/50 | **fix**: skew to 3 degrees or none |
| `Sections.jsx:222-229` Expand | Dark section widens from a rounded card | Scroll | scrubbed | linear | **fix**: move to transform or a radius on a wrapper, and measure |
| `Sections.jsx:29-49` CountUp | Number counts up from 60% | In view, once | 0.7 to 1.4s | `EASE_REVEAL` | **fix**: merge with StatValue |
| `showcase.css:396-398` | Capability numbers drop in | `.is-in` | 0.6s | `--ease-out` | **fix**: fold into the grid stagger |
| `showcase.css:306, 427` | Glow follows the pointer in capability columns | Pointer move | 0.4s fade | default | **cut** |
| `showcase.css:471-475` | Grid image unmasks, hover zoom 1.04 | `.is-in`, hover | 0.7s, 0.8s | `--ease-out` | **keep**, on tokens, after removing the three stale definitions |
| `editorial.css:143-144` | Playground image zoom 1.04 | Hover | 0.64s | raw `cubic-bezier` | **fix**: same hover language as the grid |
| `editorial.css:301-302` lazy media | Image fades in when loaded | Image load | 0.24s | ease | **keep** |

### Work stage

| Where | What it does | Trigger | Duration | Easing | Verdict |
| --- | --- | --- | --- | --- | --- |
| `stage.css:21` tab bar fill | Progress under the active tab, then auto-advance | In view | 9s | linear | **keep**: it is the stage's one ambient element |
| `stage.css:164-166` panel change | Old panel fades up and out, new one settles from below | Tab change | 0.18s out, 0.27s in | ease-in, `--ease-out` | **fix**: direction by index, sliding indicator, crossfaded media |
| `WorkStage.jsx:56` StatValue | Stats count from zero | Panel on stage, once | 0.6s | `EASE_OUT` | **fix**: merge with CountUp |
| `stage.css:169-170` | Jarvis frame settles as the demo loads | Click | 0.45s | `--ease-out` | **keep** |
| `stage.css:178-180` | Flight Recorder playhead and diff lines | Autoplay, click | 0.45s, 0.3s at 90ms apart | `--ease-out` | **keep** |
| `stage.css:183-186` | PRH-JEPA bar scales, caption cross-fades | Toggle | 0.6s, 0.3s | `--ease-out` | **keep** |
| `stage.css:192-194` | Haloscript shell tilts in | Device change | 0.55s | `--ease-out` | **keep** |
| `stage.css:211-212` | Digital Me cover pushes in | Panel on stage | 12s, alternating | ease-in-out | **keep** (slow, low amplitude, rests off screen) |
| `stage.css:118-121, 216` | Site Recon lines print | Panel on stage | 0.35s at 90ms apart | `--ease-out` | **keep** |
| `stage.css:119` caret | Terminal caret blinks | Always | 1s | steps | **keep** |
| `WorkStage.jsx:39` useAutoStep | Demos step by themselves | In view | 1.7s, 3.2s | none | **keep** |

### Pointer and micro-interactions

| Where | What it does | Trigger | Duration | Easing | Verdict |
| --- | --- | --- | --- | --- | --- |
| `Cursor.jsx:18-24` | Ring trails the pointer | Pointer move | lerp 0.2 per frame | none | **fix**: frame-rate independent |
| `showcase.css:329-337` | Ring grows on links, becomes a labelled disc | Hover | 0.35s on width and height | `--ease-out` | **fix**: scale, not width; gentler blend |
| `pointerFx.js:14-24` + `showcase.css:340` | Buttons lean toward the pointer | Pointer move | 0.45s CSS transition | `--ease-out` | **fix**: spring motion values, half strength |
| `showcase.css` `.sc-hero-btn`, `.sc-btn`, `.ed-link` | Button lift, gap change, arrow nudge | Hover | 0.25s | default | **fix**: one hover language and a press state |
| `showcase.css:481-483` | Underline draws under the email | Hover | 0.5s | `--ease-out` | **keep** |
| `showcase.css:259-263` | Nav turns to dark glass over the hero | Scroll | 0.45s | `--ease-out` | **keep** |
| `showcase.css:494, 497` | Phone menu drops in | Tap | 0.2s | `--ease-out` | **keep** |

### Ambient and site-wide

| Where | What it does | Trigger | Duration | Easing | Verdict |
| --- | --- | --- | --- | --- | --- |
| `editorial.css:495-496` paper grain | Fixed overlay jumps position | Always | 0.72s, stepped | steps | **cut** (invisible on the dark theme, repaints the viewport) |
| `SignalField` in Contact | Signals gather on the email once, then rest | Section in view | 1.4s | cubic out | **keep**: Contact's one moment |
| `BB8Companion.*` | Droid roams, reacts, sleeps | Idle after first input | varies | varies | **keep** internals; fix the footer overlap only |
| `editorial.css:507-550` project page previews | Scan beam, pulse, caret on project covers | Hover on project pages | 0.8 to 3.6s loops | mixed | **keep** (project pages, not the home page) |
| `index.css:219-323` | CRT flicker, badge spin, float, glow pulse | EMET and other takeover views | loops | mixed | **keep** (not on the home page) |
| `CommandPalette.jsx:100-108` | Palette fades and settles | Shortcut | 0.15s, 0.22s | raw bezier | **fix**: tokens only |

## Cut list

These go in Phase 2, pending your OK:

1. Paper grain animation and overlay (`editorial.css:495`).
2. DecodeLine glyph scramble (`Sections.jsx:57`).
3. Hero feed scan sweep and timer bar (`showcase.css:234, 272`).
4. Hero pointer spotlight (`showcase.css:266`).
5. Capability column pointer glow (`showcase.css:306, 427`).
6. Dust specks in the hero canvas (`SignalField.jsx:108`).
7. Marquee skew above 3 degrees (`Sections.jsx:196`).
8. The always-on "Click the network" hint (shown after idle, or removed).
9. About 300 lines of dead motion CSS and eight dead keyframes (see above).
10. The three stale `.sc-card-media` definitions.
11. One of the two counters.

## Decisions I need from you

1. **The shape-shifting hero graph.** You asked for it last round ("do
   something crazy") and this brief asks for calm with one primary motion per
   viewport. They pull in opposite directions. My recommendation: keep the
   layered graph as the single hero shape, slow and low, and keep the click
   burst. Drop the automatic morphing, or keep it as a reward for clicking
   (each click changes the shape). Say which.
2. **The intro.** I will try the name-to-headline handoff first. If the shared
   move cannot be made clean on both viewports, I will delete the curtain and
   put that quality into the hero entrance, as the brief allows.
3. **Card to project page.** I plan to use the View Transitions API with a
   fade fallback, because the router is hash-based and both views live in one
   scroller, which makes Framer shared layout fragile here. Tell me if you
   would rather have the Framer version.
4. **The recorded videos are about 25MB.** I have not committed them. I
   suggest keeping `motion-audit/before/` and `after/` out of git and
   committing only `AUDIT.md` and the two scripts.

## Performance, before and after

Same script (`measure.mjs`), same machine, 1440x900, full home scroll under
4x CPU throttling.

| Measure | Before | After |
| --- | --- | --- |
| Average fps | 54.2 | 55.6 |
| p50 frame time | 17.1ms | 16.8ms |
| p95 frame time | 23.7ms | 25.3ms |
| p99 frame time | 40.2ms | 34.5ms |
| Frames over 33ms | 7 of 463 | 5 of 463 |
| Long tasks over 50ms | 1 (117ms) | 1 (117ms) |
| `@keyframes` | 33 | 26 |
| Distinct CSS durations | 67 | 27 (5 tokens, the rest are delays and ambient loops) |
| Distinct CSS easings | 14 | 8 (3 tokens, `linear`, two `steps()`, and BB-8's own two) |
| Lines in showcase, editorial and stage CSS | 1,467 | 1,064 |
| Home page length | 7,845px | 7,845px |

Read these honestly: the scroll numbers barely moved. The page was already
close to 60fps at 4x throttle, and run-to-run noise on these figures is a
frame or two. The pass made the motion calmer and consistent; it did not make
scrolling measurably faster. What did change is the work per frame that no
longer happens at all: no full-viewport repaint every 0.72s (paper grain), no
React re-render per frame (the name scramble), no clip-path string rebuilt on
every scroll frame (Expand), no 0.9s whole-page restyle on a palette change.

The one long task is not motion code. It starts at 3,089ms, as the BB-8
companion's scripts arrive (the first at 3,099ms): that is three.js loading
on first input. BB-8's internals were out of scope for this pass.

## What changed, phase by phase

**Phase 1, system.** `src/lib/motion.js` holds five durations, three curves,
three staggers and the springs. `index.css` mirrors them. Every transition
and animation in the four main stylesheets uses them. `MOTION.md` is the
reference.

**Phase 2, subtract.** Cut: paper grain, the name scramble, the hero feed's
rotation with its scan and timer, the hero spotlight, the capability glow,
canvas dust, 431 dead CSS rules. Calmed: the hero graph changes shape only
when clicked, the marquee leans 2 degrees, the hint waits for idle, palette
changes take 0.35s.

**Phase 3, signature moments.**
1. Intro handoff: the hero is its own title card. The name sets large
   mid-screen and the same `h1` travels to its place. Measured on a first
   visit: the rest of the hero starts arriving 0.86s after the name appears,
   and the name is in place at 1.41s. Any input skips it.
2. Hero entrance on one timeline; scroll-away in fractions of the viewport.
3. One reveal (`Enter`, firing at about 30% visible) and one heading pattern.
   `Expand` became a static sheet.
4. Card to project page with the View Transitions API, both directions, and
   one `RouteTransition` in place of eight wrappers.
5. Work stage: a sliding tab highlight, cross-fading panels, copy sliding in
   from the side the stage moved.

**Phase 4, touch.** Frame-rate independent cursor that only scales; spring
magnets at half strength; one hover and press language; one counter; the
playground link colour (about 1.1 to 1, now about 9 to 1); BB-8 off the
footer.

**Phase 5, polish.** Removed the standing `will-change` on the hero name.
Recorded the after videos (`motion-audit/after/`, same flows and viewports).

## Left alone, on purpose

- **BB-8's internals** and its three.js load, as the brief asked.
- **Project pages' own animations** (`ProjectPage.jsx`, `ui.jsx`): moved onto
  the tokens, not redesigned.
- **Takeover views** (EMET, solar system, infinity, digital double): their
  CRT flicker and float loops are theirs.
- **The palette shift per section**: kept, shortened.
- **The pinned hero and the sheet sliding over it**: already the right idea.
- **No GSAP, no Lenis**: nothing measured asked for them, and native
  container scroll is what the anchors and tests rely on.

## Not verified

- **Reduced motion** was not exercised in a browser. Every effect added in
  this pass has a reduced-motion branch in code, and the existing ones were
  kept.
- **Safari and Firefox.** Everything here was checked in Chrome. The view
  transition falls back to a fade where the API is missing.
- **A real 120Hz display.** The cursor change is by construction, not by
  measurement on such a screen.
- **The alternative for the intro**, a separate curtain element with a FLIP
  to the `h1`, was not built. Making the hero its own title card was simpler
  and lands the name exactly, because it is the same element throughout.
