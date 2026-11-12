# Motion

How things move on this site, and the rules for adding anything that moves.

The feel: calm, confident, editorial, with a few moments worth remembering.
Fewer things move, and the ones that do move with weight and intent.

## The rules

1. **One primary motion per viewport.** If the hero graph is moving, nothing
   else in the hero loops. If a tab bar is counting down, the demo beside it
   plays once and stops. Everything else is still, or nearly still.
2. **Choreography over effects.** Things arrive in reading order on one
   timeline, not as independent fades.
3. **Size sets speed.** Big things move slower and further; small things fast
   and short. Pick the duration token by what is moving, not by taste.
4. **Curves for scripts, springs for hands.** A reveal that plays by itself
   uses an easing curve. Anything that answers the pointer uses a spring.
5. **Things travel, they do not vanish.** A card becomes its page; a tab
   indicator slides to the next tab.
6. **Ambient loops are slow and few.** At least 6 seconds, low amplitude, and
   they stop off screen and in a hidden tab.
7. **Transform and opacity only** on DOM nodes. `clip-path` is allowed for
   mask reveals that play once. Never animate width, height, top or left.

## Tokens

`src/lib/motion.js` is the source of truth. `src/index.css` mirrors it as CSS
variables. Change both together. Nothing else in the codebase may hold a raw
duration or curve.

### Durations

| Token | JS | CSS | Use for |
| --- | --- | --- | --- |
| instant | `DUR.instant` | `--dur-instant` (0.12s) | State flips: a colour, a tick |
| fast | `DUR.fast` | `--dur-fast` (0.2s) | Small UI: hovers, presses, menus |
| base | `DUR.base` | `--dur-base` (0.35s) | One element arriving: a card, a line of copy |
| slow | `DUR.slow` | `--dur-slow` (0.6s) | A group arriving: a heading, a panel, a media reveal |
| scene | `DUR.scene` | `--dur-scene` (0.9s) | The page changing: intro, route, hero |

### Curves

| Token | JS | CSS | Use for |
| --- | --- | --- | --- |
| out | `EASE.out` | `--ease-out` | The default. Anything arriving. Quick start, long settle |
| standard | `EASE.standard` | `--ease-standard` | Moving between two resting places: toggles, cross-fades |
| exit | `EASE.exit` | `--ease-exit` | Leaving. Keep exits at `fast` or shorter |

`linear` is allowed only for progress (a timer bar, a scroll bar) and for
loops that must not ease. `steps()` is allowed for a text caret.

### Staggers

| Token | JS | CSS | Use for |
| --- | --- | --- | --- |
| tight | `STAGGER.tight` | `--stagger-tight` (40ms) | Letters, list rows |
| base | `STAGGER.base` | `--stagger-base` (70ms) | Cards, lines of copy |
| loose | `STAGGER.loose` | `--stagger-loose` (90ms) | The parts of a heading |

In CSS, stagger with an index: `transition-delay: calc(var(--i, 0) * var(--stagger-base))`.

### Springs

`SPRING.heavy`, `medium`, `light`, `cursor`, `press`. Use them directly with
`useSpring(value, SPRING.light)`, or as a transition with `spring("light")`.

### Helpers

- `tween("slow")`, `tween("fast", "exit", 0.1)`: a transition from tokens.
- `fadeUp`, `maskReveal`, `scaleIn`: variants. Set `initial="hidden"` and
  `animate="shown"` on the parent and pass `custom={index}` to stagger.

## Usage

```jsx
import { fadeUp, tween, spring } from "../lib/motion";

<motion.p variants={fadeUp} custom={1} />
<motion.div animate={{ opacity: 1 }} transition={tween("slow")} />
<motion.span layoutId="tab" transition={spring("light")} />
```

```css
.card { transition: transform var(--dur-fast) var(--ease-out); }
.card:hover { transform: translateY(-4px); }
```

## Reduced motion

`prefers-reduced-motion: reduce` means:

- Changes are instant, or a plain fade at `fast`.
- No parallax, no scroll-scrubbed motion, no magnetic buttons, no trailing
  cursor, no autoplay, no count-up, no auto-advancing tabs.
- Every number and every line of copy is in its final state on first paint.
- Canvases draw one still frame.

Each new effect needs its reduced-motion branch in the same change. In JS,
read `useReducedMotion()`. In CSS, add the rule to the file's
`@media (prefers-reduced-motion: reduce)` block.

## Pointer effects

The trailing cursor and magnetic buttons never mount on touch or coarse
pointers. Check `(hover: hover) and (pointer: fine)` before attaching them.

## Checking a change

- `npm run lint`, `npm run test:emet`, `npm run build`.
- `npx playwright test -c motion-audit/playwright.chrome.config.js` runs the
  smoke and accessibility tests with a local Chrome.
- `node motion-audit/record.mjs after` records the four reference flows at
  both viewports, and `node motion-audit/measure.mjs` prints the numbers
  `motion-audit/AUDIT.md` quotes. Both need the dev server on port 5174.
