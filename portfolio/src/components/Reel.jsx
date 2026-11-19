import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Play } from "lucide-react";
import { FLAGSHIPS } from "../data/showcase";
import { getProject } from "../data/projects";
import { filmEnabled } from "../lib/intro";
import "../reel.css";

/* /reel/: the optional film, poster first.

   The poster is one finished still (public/film/reel-poster.jpg), the
   title, how long it is, what it holds, and a way into each project. Only
   Play loads the film's code. Where the film cannot run well (reduced
   motion, Save-Data, a slow connection, no WebGL 2, a phone or a touch
   screen) the poster is the whole page and there is no Play. */
const ReelFilm = lazy(() => import("../film/ReelFilm"));
const PROJECTS = FLAGSHIPS.map((flag) => getProject(flag.slug)).filter(Boolean);
const CAN_PLAY_QUERY = "(min-width: 900px) and (hover: hover) and (pointer: fine)";

function canPlay() {
  if (typeof window === "undefined") return false;
  return filmEnabled() && window.matchMedia(CAN_PLAY_QUERY).matches;
}

export default function Reel() {
  const [playable] = useState(canPlay);
  const [playing, setPlaying] = useState(false);
  // Fetch the film's code before showing the player, so the first frame of
  // the film is the film, not a wait.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!playing) return undefined;
    let live = true;
    import("../film/ReelFilm").then(() => { if (live) setReady(true); }, () => { if (live) setPlaying(false); });
    return () => { live = false; };
  }, [playing]);

  if (playing && ready) return <Suspense fallback={null}><ReelFilm onExit={() => { setPlaying(false); setReady(false); }} /></Suspense>;

  return <div className="reel-poster">
    <a href="/#projects" className="reel-back"><ArrowLeft size={16} aria-hidden="true" />Back to the work</a>
    <figure className="reel-still"><img src="/film/reel-poster.jpg" alt="" width="1600" height="900" decoding="async" /></figure>
    <div className="reel-copy">
      <p className="reel-kicker">The film</p>
      <h1>Mohamed Ansar, the reel</h1>
      <p className="reel-length">An 8 second opening, then about ten screens you scroll through at your own pace.</p>
      <p className="reel-what">The name, the numbers behind it, then five of the six projects, each with its real links. Digital Me is not in the film. All six are below and on the home page.</p>
      {playable
        ? <button type="button" className="reel-play" onClick={() => setPlaying(true)} aria-busy={playing || undefined}><Play size={18} aria-hidden="true" />{playing ? "Starting the film" : "Play the film"}</button>
        : <p className="reel-note">The film plays on a desktop browser with motion turned on. Everything in it is in the projects below.</p>}
      <ul className="reel-projects" aria-label="The six projects">
        {PROJECTS.map((project) => <li key={project.slug}><a href={`/work/${project.slug}/`}>{project.title}<ArrowUpRight size={14} aria-hidden="true" /></a></li>)}
      </ul>
    </div>
  </div>;
}
