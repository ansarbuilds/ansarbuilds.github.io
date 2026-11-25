import "../film/chrome.css";
import { useEffect, useRef, useState } from "react";
import { cue, onSoundChange, soundOn, soundPlaying } from "../lib/sound";

/* What sits around the film while it plays (see App):

   FilmIdent  the studio ident it opens on, over black: a point of light
              ignites into a streak and bursts with a jolt, a ring of
              light and flares, rays fan out, and sparks fly out and are
              pulled back in as the name comes together in gold. It holds the screen
              until the film's first frame.
   FilmSkip   the way out, big enough that nobody has to look for it, and
              the nudge to tap for sound (a browser plays none before a
              click, tap or key). */
// The sparks thrown out by the burst: each flies out on its own angle (a
// golden-angle spiral, so they spread evenly) and lands at its own place
// along the name, -1 to 1.
const SPARKS = Array.from({ length: 26 }, (_, i) => {
  const angle = i * 2.39996, reach = 16 + ((i * 37) % 23);
  return { "--i": i, "--ox": `${(Math.cos(angle) * reach).toFixed(1)}vmin`, "--oy": `${(Math.sin(angle) * reach * 0.7).toFixed(1)}vmin`, "--t": ((i / 25) * 2 - 1).toFixed(2) };
});
// Lens flares sliding along the streak: size and where each ends up.
const FLARES = [["9vmin", "34vw", "-3vmin"], ["4vmin", "-22vw", "2vmin"], ["14vmin", "-40vw", "5vmin"]];

export function FilmIdent() {
  return <div className="film-ident" aria-hidden="true">
    <div className="film-ident-stage">
      <span className="film-ident-rays" />
      <span className="film-ident-burst" />
      <span className="film-ident-shock" />
      <span className="film-ident-line" />
      {FLARES.map(([s, x, y]) => <span key={x} className="film-ident-flare" style={{ "--s": s, "--x": x, "--y": y }} />)}
      {SPARKS.map((style) => <span key={style["--i"]} className="film-ident-spark" style={style} />)}
      <div className="film-ident-logo">
        <p className="film-ident-name">ansarbuilds</p>
        <p className="film-ident-sub">presents</p>
      </div>
    </div>
  </div>;
}

// How long the burst left behind by the skip lasts, at most.
const BURST_MS = 600;

const stillWanted = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

// The button's face, shared by the button and the burst it leaves.
const SkipFace = () => <>
  <span className="film-skip-fuse" aria-hidden="true" />
  <span className="film-skip-glint" aria-hidden="true" />
  <span className="film-skip-text">
    <span className="film-skip-main">You can skip this.</span>
    <span className="film-skip-sub">
      <span className="film-skip-sub-a">I'll only cry a little.</span>
      <span className="film-skip-sub-b" aria-hidden="true">Okay, maybe a lot.</span>
    </span>
  </span>
  <span className="film-skip-ff" aria-hidden="true"><i /><i /><i /></span>
</>;

/* The skip slams in like a title, a spark runs round its edge like a lit
   fuse, and fast-forward chevrons march beside it. Hovered, it tilts and
   admits it might cry a lot. Pressed, the film goes at once, with a whoosh
   and a drum, and the button leaves a burst behind (FilmSkipBurst): it
   punches in and bursts, with a ring and a flash. `onSkip(burst)` says
   whether to show that burst (not with reduced motion). */
export function FilmSkip({ onSkip }) {
  const [waiting, setWaiting] = useState(() => soundOn() && !soundPlaying());
  const gone = useRef(false);
  useEffect(() => {
    const check = () => setWaiting(soundOn() && !soundPlaying());
    const off = onSoundChange(check);
    // The sound starts a moment after the tap that wakes it.
    const poll = setInterval(check, 500);
    return () => { off(); clearInterval(poll); };
  }, []);
  const skip = () => {
    if (gone.current) return;
    gone.current = true;
    cue("whoosh");
    cue("drum");
    onSkip(!stillWanted());
  };
  return <>
    <button type="button" className="film-skip" onClick={skip} onPointerEnter={() => cue("tick")} aria-label="Skip the movie">
      <SkipFace />
    </button>
    <FilmTap waiting={waiting} />
  </>;
}

/* What the skip leaves as the film goes: the button punching in and
   bursting, a ring off it and a flash from its corner. Only a picture: it
   takes no clicks, and goes when its burst is over. */
export function FilmSkipBurst({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, BURST_MS);
    return () => clearTimeout(timer);
  }, [onDone]);
  return <>
    <span className="film-skip-flash" aria-hidden="true" onAnimationEnd={onDone} />
    <div className="film-skip-ghost" aria-hidden="true"><SkipFace /><span className="film-skip-ring" /></div>
  </>;
}

// How long "Sound on" stays up once the tap wakes the sound.
const WOKE_MS = 1100;

/* Tap for sound: a speaker sending out waves, sonar rings off the badge and
   a five-band meter, until the first tap wakes the sound. Then it answers:
   the meter jumps, the rings blast out, it says "Sound on", and goes. */
function FilmTap({ waiting }) {
  const [woke, setWoke] = useState(false);
  const was = useRef(waiting);
  useEffect(() => {
    const before = was.current;
    was.current = waiting;
    if (!before || waiting) return undefined;
    setWoke(true);
    const timer = setTimeout(() => setWoke(false), WOKE_MS);
    return () => clearTimeout(timer);
  }, [waiting]);
  if (!waiting && !woke) return null;
  return <p className={`film-tap${woke ? " is-woke" : ""}`} aria-hidden="true">
    <span className="film-tap-ring" /><span className="film-tap-ring is-late" />
    <span className="film-tap-speaker"><span className="film-tap-cone" /><span className="film-tap-arc" /><span className="film-tap-arc" /><span className="film-tap-arc" /></span>
    <span className="film-tap-text">
      <span className="film-tap-ask">Tap anywhere for sound</span>
      <span className="film-tap-on">Sound on</span>
    </span>
    <i className="film-tap-eq"><b /><b /><b /><b /><b /></i>
  </p>;
}
