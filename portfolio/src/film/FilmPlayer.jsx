import "./player.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { ACT_TWO, BUILT, shotsFor } from "./actTwo/timeline.js";
import { FINALE } from "./finale/timeline.js";
import { cue, holdSound, onSoundChange, setSound, showBed, soundOn } from "../lib/sound";
import { holdScroll } from "../lib/scroll";
import { setQuiet } from "./quiet";

/* The film, cut as a trailer. After the cold open (which plays in its own
   layer, see ColdOpen.jsx) the player runs a list of short clips on one
   clock, full screen over the page, with the score: a few seconds of each
   act, the project sets as a montage of one-second cuts, a chapter card
   smashed in between the acts, and the finale's line to end on. Then the
   film lifts off the page, which is an ordinary page to scroll.

   A clip plays a stretch of an act's own timeline (`from` to `to`, in the
   act's seconds) in `seconds` of film, with a speed ramp: it leaves fast
   and slows into the cut. Every cut punches in; a card cuts in on a flash.

   It mounts as the film starts, so the acts' scenes load while the cold
   open is on screen, and starts its clock once `rolling`.
   `children(playback)` renders the acts (FilmReel in Sections.jsx); each act
   asks `playback` where the film is in it (see useAct.js). Space pauses,
   the arrow keys step two seconds, M mutes and Escape skips to the page. */
const CARD = 0.5; // a chapter card
const LIFT = 0.6; // the film fading off the page
const PREROLL = 0.3; // the next act starts drawing this early, out of sight
const linear = (u) => u;
const ramp = (u) => 1 - (1 - u) ** 1.7;
const arrival = (slug) => ACT_TWO.entries.find((entry) => entry.shot.id === shotsFor(slug)[0].id);
const CLIPS = [
  // Out of the cold open's last frame: the camera through the name.
  { act: "act1", from: 0, to: 6.6, seconds: 3.4, ease: linear },
  { card: "act2", seconds: CARD },
  // Each project's name as its set cuts in.
  // (The name is up from about a fifth of the arrival to three quarters:
  // the clip lands on it and slows while it reads.)
  ...BUILT.map((slug) => { const a = arrival(slug), d = a.t1 - a.t0; return { act: "act2", from: a.t0 + 0.1 * d, to: a.t0 + 0.74 * d, seconds: 1, ease: ramp }; }),
  { card: "act3", seconds: CARD },
  { act: "act3", from: 0, to: 7.5, seconds: 3, ease: ramp },
  { card: "act4", seconds: CARD },
  { act: "act4", from: 0, to: 9.6, seconds: 3.4, ease: ramp },
  { act: "finale", from: 0.3, to: FINALE.seconds, seconds: 2.4, ease: linear, hold: 0.8 },
];
// Each clip on the film's clock, `start` to `end`; `show` is the element
// on screen (an act, or a card), `bed` the music under it.
const SEGMENTS = [];
for (const [index, clip] of CLIPS.entries()) {
  const start = SEGMENTS.at(-1)?.end ?? 0;
  SEGMENTS.push({ ...clip, index, start, end: start + clip.seconds + (clip.hold ?? 0), show: clip.act ?? `card-${clip.card}`, bed: clip.act ?? clip.card });
}
export const FILM_SECONDS = SEGMENTS.at(-1).end;
const STEP = 2;
const IDLE_MS = 1800;
const clamp01 = (u) => Math.min(1, Math.max(0, u));
// Where an act's own timeline is, at a moment of a clip.
const actTime = (segment, elapsed) => segment.from + (segment.to - segment.from) * segment.ease(clamp01((elapsed - segment.start) / segment.seconds));
const restart = (el, name) => { if (!el) return; el.classList.remove(name); void el.offsetWidth; el.classList.add(name); };

const clock = (seconds) => { const s = Math.max(0, Math.floor(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export default function FilmPlayer({ rolling, onEnd, children }) {
  const root = useRef(null);
  const flashRef = useRef(null);
  const scrub = useRef(null);
  const time = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [idle, setIdle] = useState(false);
  const [sound, setSoundState] = useState(soundOn);
  const end = useRef(onEnd);
  useLayoutEffect(() => { end.current = onEnd; });
  // Everything the frame loop reads, kept out of React so a frame is cheap.
  const state = useRef({ elapsed: 0, playing: true, rolling: false, segment: null, films: new Map(), drawing: new Map(), failed: new Set(), ended: false });

  const [playback] = useState(() => ({
    timeOf: (id) => {
      const { segment, elapsed } = state.current;
      if (segment?.act === id) return actTime(segment, elapsed);
      // Not on: held on where its next clip starts, ready for the cut.
      const next = SEGMENTS.find((x) => x.act === id && x.start >= (segment?.start ?? -1));
      return (next ?? SEGMENTS.find((x) => x.act === id)).from;
    },
    isOn: (id) => state.current.segment?.act === id,
    attach: (id, film) => {
      const { films, drawing } = state.current;
      if (film) films.set(id, film); else { films.delete(id); drawing.delete(id); }
    },
    failed: (id) => state.current.failed.add(id),
  }));

  useEffect(() => onSoundChange(setSoundState), []);

  const finish = () => {
    const s = state.current;
    if (s.ended) return;
    s.ended = true;
    end.current?.();
  };

  // The frame loop: the clock, which act is on, which acts draw, the bar.
  useEffect(() => {
    let frame = 0, last = performance.now(), told = -1;
    const s = state.current;
    const sections = () => root.current?.querySelectorAll(".film-act, .film-chapter") ?? [];
    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      s.rolling = rolling;
      if (!rolling) return;
      if (s.playing) s.elapsed = Math.min(FILM_SECONDS + LIFT, s.elapsed + dt);
      let segment = SEGMENTS.find((x) => s.elapsed < x.end) ?? SEGMENTS.at(-1);
      // An act that could not start is passed over.
      while (segment.act && s.failed.has(segment.act) && s.elapsed < FILM_SECONDS) { s.elapsed = segment.end; segment = SEGMENTS.find((x) => s.elapsed < x.end) ?? SEGMENTS.at(-1); }
      if (segment !== s.segment) {
        const was = s.segment;
        s.segment = segment;
        let on = null;
        sections().forEach((el) => { const here = el.dataset.act === segment.show; el.classList.toggle("is-on", here); el.toggleAttribute("inert", !here); if (here) on = el; });
        SEGMENTS.forEach((x) => showBed(x.bed, false));
        showBed(segment.bed, true);
        if (was) {
          // A card cuts in on a flash frame with a trailer hit; every other
          // cut punches in on the frame, its colours split for an instant.
          if (segment.card) { restart(flashRef.current, "is-on"); if (s.playing) cue("braam"); }
          else { restart(on, "is-cut"); if (s.playing && was.act === segment.act) cue("whoosh"); }
        }
      }
      // Draw the act on screen, and the next one just before its cut (all
      // through a card) so it already has a finished frame when it is shown.
      const next = SEGMENTS[segment.index + 1];
      const lead = segment.card ? segment.seconds : PREROLL;
      const visible = document.visibilityState === "visible";
      for (const [id, film] of s.films) {
        const want = visible && (id === segment.act || (next?.act === id && next.start - s.elapsed < lead));
        if (s.drawing.get(id) !== want) { s.drawing.set(id, want); film.setActive(want); }
      }
      if (scrub.current && document.activeElement !== scrub.current) scrub.current.value = Math.min(FILM_SECONDS, s.elapsed);
      const whole = Math.floor(s.elapsed);
      if (whole !== told && time.current) { told = whole; time.current.textContent = `${clock(Math.min(s.elapsed, FILM_SECONDS))} / ${clock(FILM_SECONDS)}`; }
      // The end: the film lifts off the page.
      if (root.current) root.current.style.opacity = s.elapsed > FILM_SECONDS ? String(1 - (s.elapsed - FILM_SECONDS) / LIFT) : "";
      if (s.elapsed >= FILM_SECONDS + LIFT) finish();
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

  // Leaving: the music goes, and every scene stops drawing.
  useEffect(() => () => {
    SEGMENTS.forEach((x) => showBed(x.bed, false));
    holdSound(false);
  }, []);

  const togglePlay = () => {
    const s = state.current;
    if (s.elapsed >= FILM_SECONDS) s.elapsed = 0;
    s.playing = !s.playing;
    holdSound(!s.playing);
    setPlaying(s.playing);
  };
  const seek = (seconds) => { state.current.elapsed = Math.max(0, Math.min(FILM_SECONDS - 0.01, seconds)); };

  // Keys, and the controls hiding while the film plays untouched.
  useEffect(() => {
    if (!rolling) return undefined;
    let timer = 0;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => { if (state.current.playing) setIdle(true); }, IDLE_MS);
    };
    const onKey = (event) => {
      wake();
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const onScrub = event.target === scrub.current;
      if (event.key === " " || event.key === "k") { if (event.target.closest?.("a, button") && event.key === " ") return; event.preventDefault(); togglePlay(); }
      else if (event.key === "ArrowRight" && !onScrub) { event.preventDefault(); seek(state.current.elapsed + STEP); }
      else if (event.key === "ArrowLeft" && !onScrub) { event.preventDefault(); seek(state.current.elapsed - STEP); }
      else if (event.key === "m") setSound(!soundOn());
      else if (event.key === "Escape") finish();
    };
    wake();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("pointerdown", wake, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); window.removeEventListener("pointermove", wake); window.removeEventListener("pointerdown", wake); };
  }, [rolling]);

  // A link in a card leaves the film for the page it opens. One that opens
  // a new tab, or writes an email, pauses the film instead.
  const onClick = (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    if (link.target === "_blank" || link.href.startsWith("mailto:")) { if (state.current.playing) togglePlay(); return; }
    finish();
  };

  return <div ref={root} className={`film-player ${rolling ? "is-rolling" : ""} ${idle ? "is-idle" : ""}`} role="region" aria-label="The film" tabIndex={-1} onClick={onClick}>
    {children(playback)}
    <div ref={flashRef} className="film-flash" aria-hidden="true" />
    <div className="film-controls">
      <button type="button" className="film-button" onClick={togglePlay} aria-label={playing ? "Pause the film" : "Play the film"}>{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>
      <input ref={scrub} className="film-scrub" type="range" min={0} max={FILM_SECONDS} step={0.1} defaultValue={0} aria-label="Where the film is" onInput={(event) => seek(Number(event.currentTarget.value))} />
      <span ref={time} className="film-time" aria-hidden="true">0:00 / {clock(FILM_SECONDS)}</span>
      <button type="button" className="film-button" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? "Mute the film" : "Turn the film's sound on"}>{sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}</button>
    </div>
  </div>;
}
