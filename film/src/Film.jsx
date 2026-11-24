import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CUTS, FPS } from "./cuts.js";

/* The film: a trailer cut of three projects. Hard jump cuts on the drum,
   each landing with a punch-in, a flash and a split of colour; terminal
   commands typed before each project; the projects' own footage and
   screens; numbers slammed full frame; grain and a vignette over all of it.
   It lays out for a wide screen (1280×720) or a phone held upright
   (720×1280) from the same shots. */

const INK = "#08070a";
const BONE = "#efe6d8";
const CORAL = "#ff8a5f";
const ANTON = "Anton, Impact, sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";
const MONO = "'JetBrains Mono', Menlo, monospace";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
const ease = (u) => 1 - (1 - u) ** 3;

export const Fonts = () => <style>{`
  @font-face { font-family: "Anton"; src: url("${staticFile("anton-latin-400-normal.woff2")}") format("woff2"); }
  @font-face { font-family: "Instrument Serif"; font-style: italic; src: url("${staticFile("instrument-serif-latin-400-italic.woff2")}") format("woff2"); }
  @font-face { font-family: "JetBrains Mono"; font-weight: 100 800; src: url("${staticFile("jetbrains-mono-latin-wght-normal.woff2")}") format("woff2"); }
`}</style>;

const usePortrait = () => { const { width, height } = useVideoConfig(); return height > width; };
// A size that reads the same on both layouts: a share of the shorter side.
const useUnit = () => { const { width, height } = useVideoConfig(); return Math.min(width, height) / 100; };

/* Every cut lands: a punch-in from a touch large and the colour splitting
   red and cyan, gone in a few frames. Only the big hits (a name, a number,
   a title) also flash, softly: never more than three flashes a second. */
const FLASH_ON = new Set(["impact", "braam", "finale"]);
function Cut({ children, still = false, hit }) {
  const f = useCurrentFrame();
  const u = ease(Math.min(1, f / 7));
  const scale = still ? 1 : 1.12 - 0.12 * u;
  const split = 14 * (1 - u);
  const flash = FLASH_ON.has(hit) ? interpolate(f, [0, 1, 5], [0.4, 0.25, 0], clamp) : 0;
  return <AbsoluteFill style={{ overflow: "hidden", background: INK }}>
    <AbsoluteFill style={{ transform: `scale(${scale})`, filter: split > 0.5 ? `drop-shadow(${split}px 0 0 rgb(255 40 80 / .55)) drop-shadow(${-split}px 0 0 rgb(40 210 255 / .55))` : "none" }}>{children}</AbsoluteFill>
    <AbsoluteFill style={{ background: "#fff8ee", opacity: flash, mixBlendMode: "screen" }} />
  </AbsoluteFill>;
}

// A word or line slammed full frame.
function TypeShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const long = shot.text.length > 9;
  const size = (portrait ? (long ? 15 : 22) : (long ? 17 : 26)) * unit;
  const track = interpolate(f, [0, shot.frames], [0.02, 0.06]);
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 * unit }}>
      <div style={{ font: `400 ${size}px/0.9 ${ANTON}`, letterSpacing: `${track}em`, textAlign: "center", padding: `0 ${5 * unit}px`, color: shot.accent ? "transparent" : BONE, background: shot.accent ? `linear-gradient(170deg, #fff4e6 15%, #ffc79a 50%, #d5360c 100%)` : "none", WebkitBackgroundClip: shot.accent ? "text" : undefined, backgroundClip: shot.accent ? "text" : undefined, textShadow: shot.accent ? "none" : "0 0 60px rgb(255 160 110 / .35)" }}>{shot.text}</div>
      {shot.serif && <div style={{ font: `italic 400 ${7 * unit}px/1 ${SERIF}`, color: CORAL, opacity: interpolate(f, [6, 12], [0, 1], clamp) }}>{shot.serif}</div>}
    </AbsoluteFill>
  </Cut>;
}

// A command typed at a prompt, with the cursor blinking.
function Prompt({ text, from = 0, perChar = 1.2, size }) {
  const f = useCurrentFrame();
  const typed = Math.max(0, Math.min(text.length, Math.floor((f - from) / perChar)));
  const cursor = Math.floor(f / 6) % 2 === 0 || typed < text.length;
  return <div style={{ font: `500 ${size}px/1.2 ${MONO}`, color: BONE, whiteSpace: "nowrap" }}>
    <span style={{ color: CORAL }}>~ $ </span>{text.slice(0, typed)}<span style={{ display: "inline-block", width: "0.6em", height: "1.1em", marginLeft: 2, verticalAlign: "-0.15em", background: cursor ? CORAL : "transparent" }} />
  </div>;
}

function TermShot({ shot }) {
  const unit = useUnit();
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Prompt text={shot.text} from={4} perChar={2.2} size={5.5 * unit} />
    </AbsoluteFill>
  </Cut>;
}

/* A project's title: the command typed, then its number and name slam in,
   a rule draws out under it and the line under that. */
function TitleShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const typedBy = 4 + shot.command.length * 0.6;
  const slam = ease(interpolate(f, [typedBy, typedBy + 6], [0, 1], clamp));
  const rule = ease(interpolate(f, [typedBy + 3, typedBy + 12], [0, 1], clamp));
  const line = interpolate(f, [typedBy + 6, typedBy + 12], [0, 1], clamp);
  const flash = interpolate(f, [typedBy, typedBy + 1, typedBy + 5], [0, 0.35, 0], clamp);
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 60%, ${shot.tint}22, transparent 60%), ${INK}`, padding: portrait ? `0 ${7 * unit}px` : `0 ${10 * unit}px`, justifyContent: "center", gap: 3 * unit }}>
      <Prompt text={shot.command} from={2} perChar={0.6} size={3.2 * unit} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 * unit, transform: `scale(${1.6 - 0.6 * slam})`, transformOrigin: "left center", opacity: slam, filter: `blur(${(1 - slam) * 12}px)` }}>
        <span style={{ font: `500 ${6 * unit}px/1 ${MONO}`, color: shot.tint }}>{shot.number}</span>
        <span style={{ font: `400 ${(portrait ? Math.min(20, 118 / shot.name.length) : 22) * unit}px/0.9 ${ANTON}`, color: BONE, letterSpacing: "0.01em", textShadow: `0 0 50px ${shot.tint}55` }}>{shot.name}</span>
      </div>
      <div style={{ height: 3, width: `${rule * (portrait ? 70 : 45)}%`, background: `linear-gradient(90deg, ${shot.tint}, transparent)` }} />
      <div style={{ font: `italic 400 ${(portrait ? 6 : 5) * unit}px/1.1 ${SERIF}`, color: BONE, opacity: line * 0.9 }}>{shot.line}</div>
    </AbsoluteFill>
    <AbsoluteFill style={{ background: shot.tint, opacity: flash, mixBlendMode: "screen" }} />
  </Cut>;
}

/* Footage: the project's own film, a slow push the whole shot. Wide, it
   fills the frame; upright, it sits as a panel in the middle. A label, when
   there is one, slams in at the lower left. */
function ClipShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const push = 1 + 0.06 * (f / shot.frames);
  const from = Math.round(shot.from * FPS);
  const video = <OffthreadVideo src={staticFile(shot.src)} startFrom={from} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${push})` }} />;
  const label = shot.label && ease(interpolate(f, [3, 9], [0, 1], clamp));
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ filter: "contrast(1.08) saturate(1.1)" }}>
      {portrait ? <>
        <AbsoluteFill style={{ filter: "blur(28px) brightness(.55) saturate(1.3)", transform: "scale(1.25)" }}><OffthreadVideo src={staticFile(shot.src)} startFrom={from} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /></AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}><div style={{ width: "128%", aspectRatio: "16 / 9", overflow: "hidden", boxShadow: "0 30px 80px rgb(0 0 0 / .7)" }}>{video}</div></AbsoluteFill>
      </> : video}
    </AbsoluteFill>
    {shot.label && <div style={{ position: "absolute", left: 6 * unit, bottom: portrait ? 22 * unit : 8 * unit, opacity: label, transform: `translateX(${(1 - label) * -30}px)` }}>
      <div style={{ font: `400 ${12 * unit}px/0.9 ${ANTON}`, color: "transparent", background: "linear-gradient(170deg, #fff4e6 15%, #ffc79a 55%, #d5360c)", WebkitBackgroundClip: "text", backgroundClip: "text", filter: "drop-shadow(0 4px 30px #000)" }}>{shot.label[0]}</div>
      <div style={{ font: `500 ${2.4 * unit}px/1.2 ${MONO}`, letterSpacing: "0.14em", textTransform: "uppercase", color: BONE, textShadow: "0 2px 12px #000" }}>{shot.label[1]}</div>
    </div>}
  </Cut>;
}

// A number slammed full frame.
function StatShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const u = ease(interpolate(f, [0, 6], [0, 1], clamp));
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 * unit, background: `radial-gradient(circle, ${shot.tint}30, transparent 55%), ${INK}` }}>
      <div style={{ font: `400 ${(portrait ? 30 : 34) * unit}px/0.9 ${ANTON}`, color: "transparent", background: `linear-gradient(170deg, #fffaf2 10%, ${shot.tint} 60%, #b8320e)`, WebkitBackgroundClip: "text", backgroundClip: "text", transform: `scale(${1.3 - 0.3 * u})` }}>{shot.value}</div>
      <div style={{ font: `500 ${2.8 * unit}px/1.2 ${MONO}`, letterSpacing: "0.18em", textTransform: "uppercase", color: BONE, opacity: interpolate(f, [4, 9], [0, 1], clamp), textAlign: "center" }}>{shot.label}</div>
    </AbsoluteFill>
  </Cut>;
}

// A screenshot in its device's frame.
const SHAPE = { mac: { ratio: 16 / 10, radius: 1.2, pad: 0.8 }, ipad: { ratio: 4 / 3, radius: 3, pad: 2.2 }, iphone: { ratio: 9 / 19.5, radius: 6, pad: 1.2 } };
function Device({ src, device, width, tilt = 0 }) {
  const unit = useUnit();
  const shape = SHAPE[device];
  return <div style={{ width, aspectRatio: String(shape.ratio), padding: shape.pad * unit, borderRadius: shape.radius * unit, background: "linear-gradient(160deg, #2a2a2e, #0c0c0e)", boxShadow: "0 40px 80px rgb(0 0 0 / .6), inset 0 0 0 1px rgb(255 255 255 / .08)", transform: `rotate(${tilt}deg)` }}>
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", borderRadius: (shape.radius - shape.pad / 2) * unit, display: "block" }} />
  </div>;
}

function DeviceShot({ shot }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const zoom = shot.zoom ? 1 + 0.35 * ease(f / shot.frames) : 1 + 0.05 * (f / shot.frames);
  const sizes = portrait ? { mac: width * 0.92, ipad: width * 0.86, iphone: height * 0.6 * (9 / 19.5) } : { mac: width * 0.7, ipad: height * 0.82 * (4 / 3), iphone: height * 0.84 * (9 / 19.5) };
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 40%, #3b2f25, #0d0b0a 70%)" }}>
      <div style={{ transform: `scale(${zoom})` }}><Device src={shot.src} device={shot.device} width={sizes[shot.device]} /></div>
    </AbsoluteFill>
  </Cut>;
}

// All three, landing one after another, and the stamp.
function TrioShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const land = (i) => ease(interpolate(f, [i * 3, i * 3 + 7], [0, 1], clamp));
  const stamp = ease(interpolate(f, [12, 17], [0, 1], clamp));
  const scale = portrait ? width / 980 : height / 720;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 45%, #3b2f25, #0d0b0a 70%)" }}>
      <div style={{ position: "relative", width: 900 * scale, height: 520 * scale, marginLeft: portrait ? 60 * scale : 0 }}>
        {[["halo-storybible-mac.jpg", "mac", 640, 0, 20, -1], ["halo-corkboard-ipad.jpg", "ipad", 300, 560, 170, 3], ["halo-write-iphone.jpg", "iphone", 150, -40, 230, -4]].map(([src, device, w, x, y, tilt], i) =>
          <div key={src} style={{ position: "absolute", left: x * scale, top: y * scale, opacity: land(i), transform: `translateY(${(1 - land(i)) * 120}px) scale(${1.2 - 0.2 * land(i)})` }}><Device src={src} device={device} width={w * scale} tilt={tilt} /></div>)}
      </div>
      <div style={{ position: "absolute", bottom: (portrait ? 18 : 7) * unit, padding: `${1.4 * unit}px ${3 * unit}px`, border: `2px solid ${CORAL}`, borderRadius: 999, font: `600 ${2.8 * unit}px/1 ${MONO}`, letterSpacing: "0.2em", textTransform: "uppercase", color: BONE, background: "rgb(8 7 10 / .7)", opacity: stamp, transform: `scale(${1.6 - 0.6 * stamp}) rotate(-2deg)` }}>{shot.stamp}</div>
    </AbsoluteFill>
  </Cut>;
}

// The end: the name, the address, and a nudge to scroll.
function EndShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const name = ease(interpolate(f, [0, 8], [0, 1], clamp));
  const url = interpolate(f, [8, 14], [0, 1], clamp);
  const nudge = interpolate(f, [18, 24], [0, 1], clamp);
  const out = interpolate(f, [shot.frames - 6, shot.frames], [1, 0], clamp);
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2.5 * unit, opacity: out, background: "radial-gradient(circle at 50% 50%, #2b1810, #08070a 65%)" }}>
      <div style={{ font: `400 ${(portrait ? 17 : 18) * unit}px/0.9 ${ANTON}`, color: BONE, letterSpacing: `${0.12 - 0.08 * name}em`, opacity: name, filter: `blur(${(1 - name) * 10}px)`, textAlign: "center" }}>MOHAMED ANSAR</div>
      <div style={{ font: `italic 400 ${6 * unit}px/1 ${SERIF}`, color: CORAL, opacity: url }}>ansarbuilds.dev</div>
      <div style={{ font: `500 ${2.2 * unit}px/1 ${MONO}`, letterSpacing: "0.3em", textTransform: "uppercase", color: BONE, opacity: nudge * 0.75, marginTop: 4 * unit }}>Scroll for the rest ↓</div>
    </AbsoluteFill>
  </Cut>;
}

const SHOT = { type: TypeShot, term: TermShot, title: TitleShot, clip: ClipShot, stat: StatShot, device: DeviceShot, trio: TrioShot, end: EndShot };

// Over every shot: the project's tag at the corner, grain and a vignette.
function Chrome() {
  const f = useCurrentFrame();
  const unit = useUnit();
  const cut = CUTS.find((c) => f >= c.start && f < c.end) ?? CUTS.at(-1);
  const title = CUTS.find((c) => c.chapter === cut.chapter && c.kind === "title");
  const showTag = title && cut.kind !== "title";
  return <>
    {showTag && <div style={{ position: "absolute", left: 4 * unit, top: 4 * unit, display: "flex", alignItems: "center", gap: 1.2 * unit, font: `600 ${1.9 * unit}px/1 ${MONO}`, letterSpacing: "0.2em", textTransform: "uppercase", color: BONE, textShadow: "0 1px 8px #000" }}>
      <span style={{ width: 1.2 * unit, height: 1.2 * unit, borderRadius: "50%", background: Math.floor(f / 8) % 2 ? CORAL : "#7a2a14" }} />{title.number} / {title.name}
    </div>}
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, transparent 55%, rgb(0 0 0 / .55))", pointerEvents: "none" }} />
    <AbsoluteFill style={{ opacity: 0.11, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(random(`g${f}`) * 1000)} /></filter><rect width="100%" height="100%" filter="url(#g)" /></svg>
    </AbsoluteFill>
  </>;
}

export function Film({ withScore = true }) {
  return <AbsoluteFill style={{ background: INK }}>
    <Fonts />
    {CUTS.map((shot) => { const Shot = SHOT[shot.kind]; return <Sequence key={shot.index} from={shot.start} durationInFrames={shot.frames} premountFor={10}><Shot shot={shot} /></Sequence>; })}
    <Chrome />
    {withScore && <Audio src={staticFile("score.wav")} />}
  </AbsoluteFill>;
}
