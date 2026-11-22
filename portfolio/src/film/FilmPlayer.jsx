import "./player.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { ACT_ONE } from "./actOne/timeline.js";
import { ACT_TWO } from "./actTwo/timeline.js";
import { ACT_THREE } from "./actThree/timeline.js";
import { ACT_FOUR } from "./actFour/timeline.js";
import { FINALE } from "./finale/timeline.js";
import { cue, holdSound, onSoundChange, setSound, showBed, soundOn } from "../lib/sound";
import { holdScroll } from "../lib/scroll";
import { setQuiet } from "./quiet";

/* The film, played rather than scrolled. After the cold open (which plays
   in its own layer, see ColdOpen.jsx) the acts run one after another on one
   clock, full screen over the page, with the score. Act I slides up over
   the hero; each later act is announced by a chapter card, cut in on a
   flash with a trailer hit; after the finale the credits roll, and then the
   film lifts off the page, which is an ordinary page to scroll.

   It mounts as the film starts, so the acts' scenes load while the cold
   open is on screen, and starts its clock once `rolling`.
   `children(playback)` renders the acts (FilmReel in Sections.jsx); each act
   asks `playback` where the film is in it (see useAct.js). Space pauses,
   the arrow keys step five seconds, M mutes and Escape skips to the page. */
const SLIDE = 1; // Act I sliding up over the hero
const END_HOLD = 1.4; // the finale's last frame, before the credits
const CARD = 1.8; // a chapter card
const CREDITS = 8.5; // the credits roll
const LIFT = 0.8; // the film fading off the page
const PREROLL = 0.4; // the next act starts drawing this early, out of sight
// What plays, in order. A card or the credits are words on black (they are
// in FilmReel too); `bed` is the music under them.
const ACTS = [
  { id: "act1", seconds: ACT_ONE.seconds, lead: SLIDE },
  { id: "card-act2", kind: "card", seconds: CARD, bed: "act2" },
  { id: "act2", seconds: ACT_TWO.seconds },
  { id: "card-act3", kind: "card", seconds: CARD, bed: "act3" },
  { id: "act3", seconds: ACT_THREE.seconds },
  { id: "card-act4", kind: "card", seconds: CARD, bed: "act4" },
  { id: "act4", seconds: ACT_FOUR.seconds },
  { id: "finale", seconds: FINALE.seconds, tail: END_HOLD },
  { id: "credits", kind: "credits", seconds: CREDITS, bed: "finale" },
];
// Each act on the film's clock: `start` it is on screen, `t0` its own time
// starts, `end` the next one takes over.
const SEGMENTS = [];
for (const act of ACTS) {
  const start = SEGMENTS.at(-1)?.end ?? 0, t0 = start + (act.lead ?? 0);
  SEGMENTS.push({ ...act, start, t0, end: t0 + act.seconds + (act.tail ?? 0) });
}
const BY_ID = Object.fromEntries(SEGMENTS.map((segment) => [segment.id, segment]));
export const FILM_SECONDS = SEGMENTS.at(-1).end;
const STEP = 5;
const IDLE_MS = 2400;

const clock = (seconds) => { const s = Math.max(0, Math.floor(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const smooth = (u) => u * u * (3 - 2 * u);

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
  const state = useRef({ elapsed: 0, playing: true, rolling: false, current: null, films: new Map(), drawing: new Map(), failed: new Set(), ended: false });

  const [playback] = useState(() => ({
    timeOf: (id) => state.current.elapsed - BY_ID[id].t0,
    isOn: (id) => state.current.current === id,
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
    const sections = () => root.current?.querySelectorAll(".film-act, .film-chapter, .film-credits") ?? [];
    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      s.rolling = rolling;
      if (!rolling) return;
      if (s.playing) s.elapsed = Math.min(FILM_SECONDS + LIFT, s.elapsed + dt);
      let segment = SEGMENTS.find((x) => s.elapsed < x.end) ?? SEGMENTS.at(-1);
      // An act that could not start is passed over.
      if (s.failed.has(segment.id) && s.elapsed < FILM_SECONDS) { s.elapsed = segment.end; segment = SEGMENTS.find((x) => s.elapsed < x.end) ?? SEGMENTS.at(-1); }
      if (segment.id !== s.current) {
        const was = s.current;
        s.current = segment.id;
        sections().forEach((el) => { const on = el.dataset.act === segment.id; el.classList.toggle("is-on", on); el.toggleAttribute("inert", !on); });
        const bed = segment.bed ?? segment.id;
        SEGMENTS.forEach((x) => showBed(x.id, x.id === bed));
        // A cut onto a card, or from a card into its act: one flash frame.
        if (was && (segment.kind === "card" || BY_ID[was]?.kind === "card")) {
          const flash = flashRef.current;
          if (flash) { flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on"); }
        }
        if (segment.kind === "card" && s.playing) cue("braam");
      }
      // Draw the act on screen, and the next one just before its cut (all
      // through a card) so it already has a finished frame when it is shown.
      const next = SEGMENTS[SEGMENTS.indexOf(segment) + 1];
      const lead = segment.kind === "card" ? segment.seconds : PREROLL;
      const visible = document.visibilityState === "visible";
      for (const [id, film] of s.films) {
        const want = visible && (id === segment.id || (next?.id === id && next.start - s.elapsed < lead));
        if (s.drawing.get(id) !== want) { s.drawing.set(id, want); film.setActive(want); }
      }
      // The credits roll at the clock's pace, so scrubbing moves them too.
      const roll = root.current?.querySelector(".film-credits-roll");
      if (roll && segment.kind === "credits") roll.style.setProperty("--roll", String((s.elapsed - segment.start) / segment.seconds));
      // Act I comes up over the hero like a sheet of paper.
      const first = root.current?.querySelector('[data-act="act1"]');
      if (first) first.style.transform = s.elapsed < SLIDE ? `translateY(${(1 - smooth(s.elapsed / SLIDE)) * 100}%)` : "";
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
    SEGMENTS.forEach((x) => showBed(x.id, false));
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
