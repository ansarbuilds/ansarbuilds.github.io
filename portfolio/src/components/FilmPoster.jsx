import "../film/poster.css";
import { useEffect } from "react";
import { Play } from "lucide-react";

/* What a first visit opens on: black, the film's point of light, and one
   button that plays the film with sound (a browser lets a page make sound
   only after a click, which is why the film waits for this one). The page is
   already there underneath; "Skip to the site" just lifts this off it.

   With `cover` alone it is plain black: it holds the screen between a Play
   press and the cold open's first frame, so the page never flashes. */
export default function FilmPoster({ cover = false, onPlay, onSkip }) {
  useEffect(() => {
    if (cover) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onSkip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cover, onSkip]);
  return <div className={`film-poster ${cover ? "is-cover" : ""}`} role={cover ? undefined : "dialog"} aria-modal={cover ? undefined : "true"} aria-label={cover ? undefined : "A short film"}>
    {!cover && <>
      <span className="film-poster-point" aria-hidden="true" />
      <div className="film-poster-body">
        <p className="film-poster-kicker">Mohamed Ansar · a short film</p>
        {/* Focused on arrival, so Enter or Space plays it. */}
        <button type="button" className="film-poster-play" onClick={onPlay} autoFocus><Play size={18} aria-hidden="true" />Play the film</button>
        <p className="film-poster-note">About 90 seconds, with sound</p>
      </div>
      <button type="button" className="film-poster-skip" onClick={onSkip}>Skip to the site</button>
    </>}
  </div>;
}
