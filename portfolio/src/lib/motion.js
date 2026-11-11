/* The site's motion system, and the only place a duration, a curve or a
   spring may be defined. MOTION.md explains how to use it; index.css mirrors
   the same values as CSS variables (--dur-*, --ease-*, --stagger-*) so
   stylesheets and Framer Motion always agree.

   The idea in one line: big things move slower and further, small things
   fast and short. Scripted reveals use an easing curve; anything that
   answers the pointer uses a spring. */

// Seconds. Pick by the size of what is moving, not by taste.
export const DUR = {
  instant: 0.12, // state flips: a colour, a tick, a focus ring
  fast: 0.2, // small UI: hovers, presses, menus
  base: 0.35, // one element arriving: a card, a line of copy
  slow: 0.6, // a group arriving: a heading, a panel, a media reveal
  scene: 0.9, // the page itself changing: intro, route, hero
};

// Three curves, no more.
export const EASE = {
  // The default: quick to start, long to settle (expo-out). Reveals,
  // entrances, anything arriving.
  out: [0.16, 1, 0.3, 1],
  // Symmetric, for things that move from one resting place to another
  // without arriving or leaving: toggles, sliders, cross-fades.
  standard: [0.4, 0, 0.2, 1],
  // Leaving: slow to start, gone quickly. Exits only, and keep them short.
  exit: [0.4, 0, 1, 1],
};

// Seconds between siblings arriving in reading order.
export const STAGGER = {
  tight: 0.04, // letters, list rows
  base: 0.07, // cards, lines of copy
  loose: 0.09, // the parts of a heading
};

/* Springs, for motion that follows the hand. Heavier objects settle slower
   and with more resistance; lighter ones react faster and snappier. These
   are plain spring options, so they work as `useSpring(value, SPRING.light)`
   and, through `spring()`, as a transition. */
export const SPRING = {
  heavy: { stiffness: 120, damping: 24, mass: 0.9 }, // a whole scene tilting
  medium: { stiffness: 180, damping: 24, mass: 0.6 }, // a card
  light: { stiffness: 300, damping: 28, mass: 0.4 }, // a button, a tab indicator
  cursor: { stiffness: 400, damping: 30, mass: 0.2 }, // the trailing cursor
  press: { stiffness: 520, damping: 32, mass: 0.5 }, // a press and release
};
export const spring = (name = "light") => ({ type: "spring", ...SPRING[name] });

// A tween from tokens: tween("slow"), tween("fast", "exit", 0.1).
export const tween = (duration = "base", ease = "out", delay = 0) => ({ duration: DUR[duration], ease: EASE[ease], delay });

/* Reusable variants. Give the parent `initial="hidden"` and
   `animate="shown"` (or `whileInView`); pass `custom={index}` to stagger. */
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  shown: (i = 0) => ({ opacity: 1, y: 0, transition: tween("slow", "out", i * STAGGER.base) }),
};
// A line rising out of a mask. The parent needs `overflow: hidden`.
export const maskReveal = {
  hidden: { y: "108%" },
  shown: (i = 0) => ({ y: "0%", transition: tween("slow", "out", i * STAGGER.loose) }),
};
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  shown: (i = 0) => ({ opacity: 1, scale: 1, transition: tween("base", "out", i * STAGGER.base) }),
};
