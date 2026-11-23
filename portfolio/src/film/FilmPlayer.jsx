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
   and slows into the cut. Where one act (or card) gives way to another it
   is a zoom dissolve: the old frame pushes on and brightens as it fades,
   the new one settles in from a touch large, both moving. Cuts inside an
   act (the project montage) punch in.

   It mounts as the film starts, so the acts' scenes load while the cold
   open is on screen, and starts its clock once `rolling`.
   `children(playback)` renders the acts (FilmReel in Sections.jsx); each act
   asks `playback` where the film is in it (see useAct.js). Space pauses,
   the arrow keys step two seconds, M mutes and Escape skips to the page. */
const CARD = 0.75; // a chapter card
const LIFT = 0.6; // the film fading off the page
const PREROLL = 0.3; // the next act starts drawing this early, out of sight
const SWELL = 0.7; // the rise into a chapter card's hit
const DISSOLVE = 0.45; // one act (or card) dissolving into the next
// The project montage: each cut a little quicker, the last held.
const MONTAGE = [1.15, 1.05, 0.95, 0.88, 0.82, 0.78, 1.37];
const linear = (u) => u;
const ramp = (u) => 1 - (1 - u) ** 1.7;
const arrival = (slug) => ACT_TWO.entries.find((entry) => entry.shot.id === shotsFor(slug)[0].id);
const CLIPS = [
  // Out of the cold open's last frame: the camera through the name.
  { act: "act1", from: 0, to: 6.6, seconds: 3.4, ease: linear },
  { card: "act2", seconds: CARD },
  // Each project's name as its set cuts in, the cuts coming faster and
  // faster until the last one holds. A riser runs under the whole montage
  // into the next chapter's hit.
  // (The name is up from about a fifth of the arrival to three quarters:
  // the clip lands on it and slows while it reads.)
  ...BUILT.map((slug, i) => { const a = arrival(slug), d = a.t1 - a.t0; return { act: "act2", from: a.t0 + 0.1 * d, to: a.t0 + 0.74 * d, seconds: MONTAGE[i] ?? 1, ease: ramp, riser: i === 0, last: i === BUILT.length - 1 }; }),
  { card: "act3", seconds: CARD },
  // The monoliths rising in real time, so both slams land on screen, then
  // a whip into the orbit.
  { act: "act3", from: 0.45, to: 2.95, seconds: 1.55, ease: linear },
  { act: "act3", from: 3.1, to: 7.5, seconds: 1.55, ease: ramp },
  { card: "act4", seconds: CARD },
  // The network falling into a star that ignites, in real time, then whips
  // to the solar system and the ribbon.
  { act: "act4", from: 0.2, to: 2.9, seconds: 1.45, ease: linear },
  { act: "act4", from: 3.2, to: 6.2, seconds: 1, ease: ramp },
  { act: "act4", from: 6.7, to: 9.5, seconds: 1.05, ease: ramp },
  { act: "finale", from: 0.3, to: FINALE.seconds, seconds: 2.8, ease: linear, hold: 1 },
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
  const state = useRef({ elapsed: 0, playing: true, rolling: false, segment: null, prev: null, swelled: -1, risen: -1, films: new Map(), drawing: new Map(), failed: new Set(), ended: false });

  const [playback] = useState(() => ({
    timeOf: (id) => {
      const { segment, elapsed } = state.current;
      if (segment?.act === id) return actTime(segment, elapsed);
      // Dissolving out: it keeps moving a little past its clip.
      const { prev } = state.current;
      if (prev?.act === id) return actTime(prev, elapsed) + (prev.to - prev.from) / prev.seconds * Math.max(0, elapsed - prev.end) * (prev.ease === linear ? 1 : 0.2);
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
    const sectionFor = (show) => root.current?.querySelector(`[data-act="${show}"]`);
    // Back to the stylesheet's say once a dissolve is done.
    const clearDissolve = (segment) => {
      const outgoing = sectionFor(segment.show);
      if (outgoing) for (const key of ["opacity", "transform", "filter", "zIndex"]) outgoing.style[key] = "";
      const incoming = sectionFor(s.segment?.show);
      if (incoming) incoming.style.transform = "";
    };
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
        // A change of act or card dissolves; the old one stays up for it.
        if (s.prev) clearDissolve(s.prev);
        // (Into a chapter card is a hard cut: a trailer title hits, it does
        // not fade up. Out of one, it dissolves like any other change.)
        s.prev = was && !segment.card && was.show !== segment.show && segment.start - s.elapsed > -DISSOLVE ? was : null;
        let on = null;
        sections().forEach((el) => { const here = el.dataset.act === segment.show; el.classList.toggle("is-on", here); el.toggleAttribute("inert", !here); if (here) on = el; });
        SEGMENTS.forEach((x) => showBed(x.bed, false));
        showBed(segment.bed, true);
        if (was && s.playing) {
          // A card lands with a soft glow and a trailer hit; a cut inside
          // an act punches in; a dissolve carries air past the lens.
          if (segment.card) { restart(flashRef.current, "is-on"); cue("braam"); cue("impact"); }
          else if (was.act === segment.act) {
            // A whip, alternating sides, on a drum hit; the last lands hard.
            if (on) on.style.setProperty("--whip", segment.index % 2 ? "1" : "-1");
            restart(on, "is-cut");
            cue("whoosh");
            cue(segment.last ? "impact" : "drum");
          }
          else cue("whoosh");
        }
      }
      // The dissolve: the outgoing frame pushes on and brightens as it
      // fades; the incoming one settles in from a touch large.
      const incoming = sectionFor(segment.show);
      if (s.prev) {
        const u = Math.min(1, Math.max(0, (s.elapsed - segment.start) / DISSOLVE));
        const e = u * u * (3 - 2 * u);
        const outgoing = sectionFor(s.prev.show);
        if (outgoing) { outgoing.style.opacity = String(1 - e); outgoing.style.transform = `scale(${1 + 0.09 * e})`; outgoing.style.filter = `brightness(${1 + 0.7 * e})`; outgoing.style.zIndex = "2"; }
        // (It is fully there under the old frame, so the dissolve never dips.)
        if (incoming) incoming.style.transform = `scale(${1.06 - 0.06 * e})`;
        if (u >= 1) { clearDissolve(s.prev); s.prev = null; }
      }
      // Draw the act on screen, and the next one just before its cut (all
      // through a card) so it already has a finished frame when it is shown.
      const next = SEGMENTS[segment.index + 1];
      // The montage's riser, from its first cut into the next card's hit.
      if (segment.riser && s.playing && s.risen !== segment.index && s.elapsed - segment.start < 0.2) {
        s.risen = segment.index;
        const card = SEGMENTS.find((x) => x.card && x.start > segment.start);
        if (card) cue("riser", card.start - s.elapsed);
        cue("drum");
      }
      // The music rises into a card's hit.
      if (next?.card && s.playing && s.swelled !== next.index && next.start - s.elapsed < SWELL) {
        s.swelled = next.index;
        cue("swell", Math.max(0.2, next.start - s.elapsed));
      }
      const lead = segment.card ? segment.seconds : PREROLL;
      const visible = document.visibilityState === "visible";
      for (const [id, film] of s.films) {
        const want = visible && (id === segment.act || s.prev?.act === id || (next?.act === id && next.start - s.elapsed < lead));
        if (s.drawing.get(id) !== want) { s.drawing.set(id, want); film.setActive(want); }
      }
      if (scrub.current && document.activeElement !== scrub.current) scrub.current.value = Math.min(FILM_SECONDS, s.elapsed);
      const whole = Math.floor(s.elapsed);
      if (whole !== told && time.current) { told = whole; time.current.textContent = `${clock(Math.min(s.elapsed, FILM_SECONDS))} / ${clock(FILM_SECONDS)}`; }
      // The end: the last frame brightens as it lifts off the page.
      if (root.current) {
        const u = s.elapsed > FILM_SECONDS ? Math.min(1, (s.elapsed - FILM_SECONDS) / LIFT) : 0;
        root.current.style.opacity = u ? String(1 - u) : "";
        root.current.style.filter = u ? `brightness(${1 + 0.9 * u})` : "";
      }
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
      if (event.key === " " || event.key === "k") {
        // Space on one of the film's own buttons presses that button.
        if (event.key === " " && event.target.closest?.("a, button") && root.current?.contains(event.target)) return;
        event.preventDefault();
        togglePlay();
      }
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
    <div className="film-atmos" aria-hidden="true" />
    <div ref={flashRef} className="film-flash" aria-hidden="true" />
    <div className="film-controls">
      <button type="button" className="film-button" onClick={togglePlay} aria-label={playing ? "Pause the film" : "Play the film"}>{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}</button>
      <input ref={scrub} className="film-scrub" type="range" min={0} max={FILM_SECONDS} step={0.1} defaultValue={0} aria-label="Where the film is" onInput={(event) => seek(Number(event.currentTarget.value))} />
      <span ref={time} className="film-time" aria-hidden="true">0:00 / {clock(FILM_SECONDS)}</span>
      <button type="button" className="film-button" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? "Mute the film" : "Turn the film's sound on"}>{sound ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}</button>
    </div>
  </div>;
}
