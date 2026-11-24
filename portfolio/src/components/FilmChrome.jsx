import "../film/chrome.css";
import { useEffect, useRef, useState } from "react";
import { cue, onSoundChange, soundOn, soundPlaying } from "../lib/sound";

/* What sits around the film while it plays (see App):

   FilmIdent  the studio ident it opens on, over black: a point of light
              ignites into a streak and bursts, rays fan out, and the name
              pulls together out of the light in gold. It holds the screen
              until the cold open's first frame.
   FilmSkip   the way out, big enough that nobody has to look for it, and
              the nudge to tap for sound (a browser plays none before a
              click, tap or key). */
export function FilmIdent() {
  return <div className="film-ident" aria-hidden="true">
    <span className="film-ident-rays" />
    <span className="film-ident-burst" />
    <span className="film-ident-line" />
    <div className="film-ident-logo">
      <p className="film-ident-name">ansarbuilds</p>
      <p className="film-ident-sub">presents</p>
    </div>
  </div>;
}

// How long the skip takes to smash out before the film goes.
const LEAVE_MS = 320;

const stillWanted = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

/* The skip slams in like a title, a spark runs round its edge like a lit
   fuse, and fast-forward chevrons march beside it. Hovered, it tilts and
   admits it might cry a lot. Pressed, it punches in, bursts and flashes,
   with a whoosh and a drum, and the film is gone. */
export function FilmSkip({ onPress, onSkip }) {
  const [waiting, setWaiting] = useState(() => soundOn() && !soundPlaying());
  const [leaving, setLeaving] = useState(false);
  const gone = useRef(false);
  const timer = useRef(0);
  useEffect(() => {
    const check = () => setWaiting(soundOn() && !soundPlaying());
    const off = onSoundChange(check);
    // The sound starts a moment after the tap that wakes it.
    const poll = setInterval(check, 500);
    return () => { off(); clearInterval(poll); clearTimeout(timer.current); };
  }, []);
  const skip = () => {
    if (gone.current) return;
    gone.current = true;
    // Nothing new starts while it smashes out (the cold open is due at the
    // end of the ident, and starting it can hold up a slow device).
    onPress?.();
    cue("whoosh");
    cue("drum");
    if (stillWanted()) { onSkip(); return; }
    setLeaving(true);
    timer.current = setTimeout(onSkip, LEAVE_MS);
  };
  return <>
    {leaving && <span className="film-skip-flash" aria-hidden="true" />}
    <button type="button" className={`film-skip${leaving ? " is-leaving" : ""}`} onClick={skip} onPointerEnter={() => cue("tick")} aria-label="Skip the movie">
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
      {leaving && <span className="film-skip-ring" aria-hidden="true" />}
    </button>
    <FilmTap waiting={waiting} />
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
