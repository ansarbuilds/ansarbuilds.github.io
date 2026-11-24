import "./player.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { onSoundChange, setSound, soundOn, soundPlaying } from "../lib/sound";
import { holdScroll } from "../lib/scroll";
import { setQuiet } from "./quiet";
import CUTS from "./filmCuts.json";

/* The film: a rendered video (made in the repo's film/ folder with
   Remotion, a trailer cut of three projects), full screen over the page,
   with the controls along the bottom. A phone held upright gets the upright
   cut. It plays muted until the visitor's first tap wakes the sound (a
   browser allows no sooner); then its own soundtrack plays. When it ends it
   lifts off the page, which is an ordinary page to scroll.

   It mounts as the film starts, so the video loads during the ident, and
   plays once `rolling`. Space pauses, the arrow keys step two seconds, M
   mutes and Escape skips to the page. `onStarted` fires on its first frame;
   if the video cannot play, it ends at once and the page is shown. */
export const FILM_SECONDS = CUTS.seconds;
const LIFT = 0.6; // the film fading off the page
const STEP = 2;
const IDLE_MS = 1800;
const WIDE = { src: "/film/film-wide.mp4", poster: "/film/film-wide-poster.jpg" };
const UPRIGHT = { src: "/film/film-upright.mp4", poster: "/film/film-upright-poster.jpg" };
const upright = () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 4/5)").matches;

// The chapters on the timeline: where each starts, its numeral and name.
const CHAPTERS = CUTS.chapters.map((c) => ({ ...c, at: c.seconds / FILM_SECONDS }));
const chapterAt = (u) => CHAPTERS.reduce((found, c, i) => (u >= c.at - 1e-6 ? i : found), 0);
const label = (c) => (c.numeral ? `${c.numeral} · ${c.name}` : c.name);

const clock = (seconds) => { const s = Math.max(0, Math.floor(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const restart = (el, name) => { if (!el) return; el.classList.remove(name); void el.offsetWidth; el.classList.add(name); };

export default function FilmPlayer({ rolling, onEnd, onStarted }) {
  const root = useRef(null);
  const video = useRef(null);
  const scrub = useRef(null);
  const time = useRef(null);
  const chapterRef = useRef(null);
  const [cut] = useState(() => (upright() ? UPRIGHT : WIDE));
  const [playing, setPlaying] = useState(true);
  const [idle, setIdle] = useState(false);
  const [sound, setSoundState] = useState(soundOn);
  const ended = useRef(false);
  const started = useRef(false);
  const end = useRef(onEnd);
  const begin = useRef(onStarted);
  useLayoutEffect(() => { end.current = onEnd; begin.current = onStarted; });

  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    end.current?.();
  };

  // Its sound: on once the visitor's first tap has woken it, and with the
  // visitor's own mute.
  useEffect(() => {
    const apply = () => { setSoundState(soundOn()); if (video.current) video.current.muted = !soundPlaying(); };
    apply();
    const off = onSoundChange(apply);
    // The sound wakes a moment after the tap that starts it.
    const poll = setInterval(apply, 300);
    return () => { off(); clearInterval(poll); };
  }, []);

  // Rolling: play from the start. A video that will not play is passed over.
  useEffect(() => {
    const el = video.current;
    if (!rolling || !el) return undefined;
    el.currentTime = 0;
    el.play().catch(() => { el.muted = true; el.play().catch(finish); });
    const failed = () => finish();
    el.addEventListener("error", failed);
    return () => el.removeEventListener("error", failed);
  }, [rolling]);

  // The frame loop: the bar, the chapter, the clock, and the lift at the end.
  useEffect(() => {
    let frame = 0, told = -1, toldChapter = -1;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const el = video.current;
      if (!el || !rolling) return;
      const t = el.currentTime;
      if (!started.current && t > 0) { started.current = true; begin.current?.(); }
      const u = Math.min(1, t / FILM_SECONDS);
      root.current?.style.setProperty("--p", u.toFixed(4));
      if (scrub.current && document.activeElement !== scrub.current) scrub.current.value = Math.min(FILM_SECONDS, t);
      const chapter = chapterAt(u);
      if (chapter !== toldChapter && root.current) {
        toldChapter = chapter;
        root.current.querySelectorAll(".film-mark").forEach((mark) => { const i = Number(mark.dataset.i); mark.classList.toggle("is-past", i <= chapter); mark.classList.toggle("is-now", i === chapter); });
        if (chapterRef.current) { chapterRef.current.textContent = label(CHAPTERS[chapter]); restart(chapterRef.current, "is-new"); }
      }
      const whole = Math.floor(t);
      if (whole !== told && time.current) { told = whole; time.current.textContent = `${clock(Math.min(t, FILM_SECONDS))} / ${clock(FILM_SECONDS)}`; }
      // The end: the last frame brightens as it lifts off the page.
      const lift = el.ended ? 1 : Math.max(0, Math.min(1, (t - (FILM_SECONDS - LIFT)) / LIFT));
      if (root.current) {
        root.current.style.opacity = lift ? String(1 - lift) : "";
        root.current.style.filter = lift ? `brightness(${1 + 0.9 * lift})` : "";
      }
      if (el.ended) finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rolling]);

  // While it rolls the page under it holds still and is out of reach.
  useEffect(() => {
    if (!rolling) return undefined;
    const page = [document.getElementById("main-content"), document.querySelector(".ed-nav")].filter(Boolean);
    page.forEach((el) => el.setAttribute("inert", ""));
    holdScroll(true);
    setQuiet(true);
    root.current?.focus({ preventScroll: true });
    return () => {
      page.forEach((el) => el.removeAttribute("inert"));
      holdScroll(false);
      setQuiet(false);
    };
  }, [rolling]);

  const togglePlay = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) { if (el.ended) el.currentTime = 0; el.play().catch(() => {}); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };
  const seek = (seconds) => { if (video.current) video.current.currentTime = Math.max(0, Math.min(FILM_SECONDS - 0.05, seconds)); };

  // Keys, and the controls hiding while the film plays untouched.
  useEffect(() => {
    if (!rolling) return undefined;
    let timer = 0;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => { if (!video.current?.paused) setIdle(true); }, IDLE_MS);
    };
    const onKey = (event) => {
      wake();
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const onScrub = event.target === scrub.current;
      const now = video.current?.currentTime ?? 0;
      if (event.key === " " || event.key === "k") {
        // Space on one of the film's own buttons presses that button.
        if (event.key === " " && event.target.closest?.("a, button") && root.current?.contains(event.target)) return;
        event.preventDefault();
        togglePlay();
      }
      else if (event.key === "ArrowRight" && !onScrub) { event.preventDefault(); seek(now + STEP); }
      else if (event.key === "ArrowLeft" && !onScrub) { event.preventDefault(); seek(now - STEP); }
      else if (event.key === "m") setSound(!soundOn());
      else if (event.key === "Escape") finish();
    };
    wake();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); window.removeEventListener("pointermove", wake); window.removeEventListener("pointerdown", wake); };
  }, [rolling]);

  return <div ref={root} className={`film-player ${rolling ? "is-rolling" : ""} ${idle ? "is-idle" : ""}`} role="region" aria-label="The film" tabIndex={-1}>
    <video ref={video} className="film-video" src={cut.src} poster={cut.poster} muted playsInline preload="auto" aria-label="A 21-second trailer: who I am, then three of my projects, Hedwig, saywhen and Haloscript" />
    <div className="film-controls">
      <button type="button" className="film-button film-play" onClick={togglePlay} aria-label={playing ? "Pause the film" : "Play the film"}>
        <span className="film-play-ring" aria-hidden="true" />
        {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
      </button>
      <div className="film-timeline">
        <div className="film-track" aria-hidden="true">
          <span className="film-fill" />
          {CHAPTERS.map((c, i) => c.numeral && <span key={c.id} className="film-mark" data-i={i} style={{ "--at": c.at }}><b>{c.numeral}</b></span>)}
          <span className="film-head" />
        </div>
        <input ref={scrub} className="film-scrub" type="range" min={0} max={FILM_SECONDS} step={0.1} defaultValue={0} aria-label="Where the film is" onInput={(event) => seek(Number(event.currentTarget.value))} />
      </div>
      <span className="film-readout" aria-hidden="true">
        <span ref={chapterRef} className="film-chapter-now">{label(CHAPTERS[0])}</span>
        <span ref={time} className="film-time">0:00 / {clock(FILM_SECONDS)}</span>
      </span>
      <button type="button" className="film-button film-sound" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? "Mute the film" : "Turn the film's sound on"}>
        {sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
        <i className="film-sound-eq" aria-hidden="true"><b /><b /><b /><b /></i>
      </button>
    </div>
  </div>;
}
