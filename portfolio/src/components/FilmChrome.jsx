import "../film/chrome.css";
import { useEffect, useState } from "react";
import { onSoundChange, soundOn, soundPlaying } from "../lib/sound";

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

export function FilmSkip({ onSkip }) {
  const [waiting, setWaiting] = useState(() => soundOn() && !soundPlaying());
  useEffect(() => {
    const check = () => setWaiting(soundOn() && !soundPlaying());
    const off = onSoundChange(check);
    // The sound starts a moment after the tap that wakes it.
    const timer = setInterval(check, 500);
    return () => { off(); clearInterval(timer); };
  }, []);
  return <>
    <button type="button" className="film-skip" onClick={onSkip} aria-label="Skip the movie">
      <span className="film-skip-main">You can skip this.</span>
      <span className="film-skip-sub">I'll only cry a little.</span>
    </button>
    {waiting && <p className="film-tap" aria-hidden="true"><i><b /><b /><b /></i>Tap anywhere for sound</p>}
  </>;
}
