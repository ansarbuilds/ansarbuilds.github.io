import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CUTS, FPS } from "./cuts.js";
import { PROMPT, RUN } from "../../portfolio/src/data/hedwigRun.js";

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

/* On a wide screen the site's controls bar covers the bottom ~8% of the
   frame while it shows, so nothing that must be read sits that low. */

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
    {shot.label && <div style={{ position: "absolute", left: 6 * unit, bottom: portrait ? 22 * unit : 15 * unit, opacity: label, transform: `translateX(${(1 - label) * -30}px)` }}>
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
const SHAPE = { mac: { ratio: 16 / 10, radius: 1.2, pad: 0.8 }, ipad: { ratio: 4 / 3, radius: 3, pad: 2.2 }, ipadUp: { ratio: 3 / 4, radius: 3, pad: 2.2 }, iphone: { ratio: 9 / 19.5, radius: 6, pad: 1.2 } };
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
  const at = shot.stampAt ?? 12;
  const stamp = ease(interpolate(f, [at, at + 5], [0, 1], clamp));
  const rays = interpolate(f, [at - 1, at + 2, shot.frames], [0, 0.7, 0.2], clamp);
  const scale = portrait ? width / 980 : height / 720;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${shot.tint ? "#2a2145" : "#3b2f25"}, #0d0b0a 70%)` }} />
    <AbsoluteFill style={{ opacity: rays, background: "repeating-conic-gradient(from 0deg, rgb(220 205 255 / .18) 0deg 2deg, transparent 2deg 9deg)", WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 60%)", maskImage: "radial-gradient(circle, #000 0%, transparent 60%)", transform: `rotate(${f * 0.3}deg) scale(1.6)` }} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 900 * scale, height: 520 * scale, marginLeft: portrait ? 60 * scale : 0 }}>
        {[["halo-storybible-mac.jpg", "mac", 640, 0, 20, -1], ["halo-corkboard-ipad.jpg", "ipad", 300, 560, 170, 3], ["halo-write-iphone.jpg", "iphone", 150, -40, 230, -4]].map(([src, device, w, x, y, tilt], i) =>
          <div key={src} style={{ position: "absolute", left: x * scale, top: y * scale, opacity: land(i), transform: `translateY(${(1 - land(i)) * 120}px) scale(${1.2 - 0.2 * land(i)})` }}><Device src={src} device={device} width={w * scale} tilt={tilt} /></div>)}
      </div>
      <div style={{ position: "absolute", bottom: (portrait ? 18 : 13) * unit, padding: `${1.4 * unit}px ${3 * unit}px`, border: `2px solid ${CORAL}`, borderRadius: 999, font: `600 ${2.8 * unit}px/1 ${MONO}`, letterSpacing: "0.2em", textTransform: "uppercase", color: BONE, background: "rgb(8 7 10 / .7)", opacity: stamp, transform: `scale(${1.6 - 0.6 * stamp}) rotate(-2deg)`, boxShadow: stamp > 0.9 ? `0 0 ${4 * unit}px ${shot.tint ?? CORAL}88` : "none" }}>{shot.stamp}</div>
    </AbsoluteFill>
    <Shockwave at={at} tint={shot.tint ?? CORAL} />
  </Cut>;
}

// "There's more": the small word, then the big one punching out of the
// tunnel, outline first, then filled.
function MoreShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const small = ease(interpolate(f, [0, 4], [0, 1], clamp));
  const big = ease(interpolate(f, [3, 9], [0, 1], clamp));
  const filled = f >= 8;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #24120a, #08070a 70%)" }} />
    <Tunnel speed={2.2} />
    <Shockwave at={3} frames={12} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: unit }}>
      <div style={{ font: `400 ${(portrait ? 11 : 9) * unit}px/1 ${ANTON}`, color: BONE, letterSpacing: `${0.5 - 0.3 * small}em`, opacity: small }}>{shot.small}</div>
      <div style={{ font: `400 ${(portrait ? 34 : 36) * unit}px/0.85 ${ANTON}`, letterSpacing: "0.02em", color: "transparent", WebkitTextStroke: filled ? undefined : `2px ${BONE}`, background: filled ? "linear-gradient(170deg, #fff4e6 15%, #ffc79a 50%, #d5360c 100%)" : "none", WebkitBackgroundClip: filled ? "text" : undefined, backgroundClip: filled ? "text" : undefined, transform: `scale(${2.4 - 1.4 * big + 0.04 * (f / shot.frames)})`, opacity: big, filter: `blur(${(1 - big) * 10}px) drop-shadow(0 0 ${3 * unit}px rgb(255 140 90 / ${filled ? 0.45 : 0}))` }}>{shot.big}</div>
    </AbsoluteFill>
  </Cut>;
}

/* The end, mirroring the opening: the terminal asks who again, the name
   slams in letter by letter with the frame shaking on the finale chord,
   the three projects light under it in their own colours, the address and
   a nudge to scroll, and then the screen switches off like an old tube. */
function EndShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const at = shot.slamAt;
  const term = interpolate(f, [at - 2, at], [1, 0], clamp);
  const shake = f >= at ? Math.exp(-(f - at) / 4) : 0;
  const sx = (random(`ex${f}`) - 0.5) * 3 * unit * shake, sy = (random(`ey${f}`) - 0.5) * 3 * unit * shake;
  const rays = interpolate(f, [at - 1, at + 2, at + 12], [0, 0.85, 0], clamp);
  const flash = interpolate(f, [at, at + 1, at + 5], [0.3, 0.18, 0], clamp) * (f >= at ? 1 : 0);
  const url = interpolate(f, [at + 16, at + 22], [0, 1], clamp);
  const nudge = interpolate(f, [at + 22, at + 27], [0, 1], clamp);
  const bob = Math.sin((f - at) * 0.35) * 0.6 * unit;
  // The tube switching off: squashed to a line, then to a dot.
  const off = interpolate(f, [shot.frames - 9, shot.frames - 4], [0, 1], clamp);
  const dot = interpolate(f, [shot.frames - 4, shot.frames - 1], [0, 1], clamp);
  const size = (portrait ? 15 : 13.5) * unit;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ transform: `scale(${1 - 0.995 * dot}, ${1 - 0.994 * off})`, filter: `brightness(${1 + 2.5 * off})`, opacity: 1 - 0.6 * dot }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #2b1810, #08070a 62%)" }} />
      <AbsoluteFill style={{ opacity: rays, background: "repeating-conic-gradient(from 0deg, rgb(255 190 140 / .16) 0deg 3deg, transparent 3deg 12deg)", WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 58%)", maskImage: "radial-gradient(circle, #000 0%, transparent 58%)", transform: "scale(1.6)" }} />
      <Shockwave at={at} frames={16} />
      {term > 0 && <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: term }}>
        <div style={{ filter: "drop-shadow(0 0 14px rgb(255 150 100 / .45))" }}><Prompt text={shot.command} from={1} perChar={1.1} size={6 * unit} /></div>
      </AbsoluteFill>}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2.6 * unit, transform: `translate(${sx}px, ${sy}px)` }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: "92%", font: `400 ${size}px/0.92 ${ANTON}`, color: BONE, letterSpacing: "0.03em", textShadow: "0 0 60px rgb(255 160 110 / .5)" }}>
          {shot.name.split(" ").map((word, w, words) => <span key={w} style={{ display: "inline-flex", whiteSpace: "nowrap", marginRight: w < words.length - 1 ? "0.25em" : 0 }}>{Array.from(word).map((ch, k) => {
            const i = words.slice(0, w).join("").length + w + k;
            const u = ease(interpolate(f, [at - 6 + i * 0.5, at - 1 + i * 0.5], [0, 1], clamp));
            return <span key={k} style={{ display: "inline-block", opacity: u, transform: `scale(${2 - u}) translateY(${(1 - u) * -16}px)`, filter: u < 1 ? `blur(${(1 - u) * 8}px)` : "none" }}>{ch}</span>;
          })}</span>)}
        </div>
        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", gap: (portrait ? 1.2 : 2) * unit }}>
          {shot.projects.map(([number, name, tint], i) => {
            const u = ease(interpolate(f, [at + 6 + i * 3, at + 10 + i * 3], [0, 1], clamp));
            return <div key={name} style={{ display: "flex", alignItems: "baseline", gap: unit, padding: `${0.9 * unit}px ${2 * unit}px`, borderRadius: 999, border: `1px solid ${tint}`, background: "rgb(16 10 8 / .7)", boxShadow: `0 0 ${2.5 * unit * u}px ${tint}55`, opacity: u, transform: `translateY(${(1 - u) * 20}px) scale(${1.2 - 0.2 * u})` }}>
              <span style={{ font: `500 ${2.2 * unit}px/1 ${MONO}`, color: tint }}>{number}</span>
              <span style={{ font: `400 ${4.2 * unit}px/1 ${ANTON}`, color: BONE, letterSpacing: "0.05em", textTransform: "uppercase" }}>{name}</span>
            </div>;
          })}
        </div>
        <div style={{ font: `italic 400 ${6 * unit}px/1 ${SERIF}`, color: CORAL, opacity: url, marginTop: unit }}>{shot.url}</div>
        <div style={{ font: `500 ${2.2 * unit}px/1 ${MONO}`, letterSpacing: "0.3em", textTransform: "uppercase", color: BONE, opacity: nudge * 0.8, transform: `translateY(${bob}px)` }}>Scroll for the rest ↓</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff8ee", opacity: flash, mixBlendMode: "screen" }} />
    </AbsoluteFill>
    {/* The last dot of light. */}
    {off > 0 && <div style={{ position: "absolute", left: width / 2 - 4 * unit, top: height / 2 - 4 * unit, width: 8 * unit, height: 8 * unit, borderRadius: "50%", background: "radial-gradient(circle, #fff 0%, rgb(255 220 190 / .6) 25%, transparent 65%)", opacity: dot > 0 ? 1 - dot * 0.5 : off * 0.6 }} />}
  </Cut>;
}

/* ---- The opening ---- */

// A rushing tunnel of speed lines behind the opening's words.
function Tunnel({ tint = CORAL, speed = 1 }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const r = Math.hypot(width, height) / 2;
  const lines = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2 + random(`a${i}`) * 0.12;
    const u = ((f * 0.07 * speed + random(`o${i}`)) % 1);
    const from = r * (0.08 + u * 0.9), to = from + r * (0.12 + 0.25 * u);
    return <line key={i} x1={width / 2 + Math.cos(a) * from} y1={height / 2 + Math.sin(a) * from} x2={width / 2 + Math.cos(a) * to} y2={height / 2 + Math.sin(a) * to} stroke={tint} strokeWidth={1 + 2.5 * u} strokeOpacity={0.15 + 0.45 * u} strokeLinecap="round" />;
  });
  return <AbsoluteFill><svg width={width} height={height}>{lines}</svg></AbsoluteFill>;
}

// A ring of light thrown out from the middle of the frame (an SVG circle
// that grows, with a soft wide stroke under a bright thin one).
function Shockwave({ at = 0, tint = "#ffd9b8", frames = 14 }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = interpolate(f, [at, at + frames], [0, 1], clamp);
  if (f < at || u >= 1) return null;
  const r = 20 + ease(u) * Math.hypot(width, height) * 0.55;
  const fade = 1 - u;
  return <AbsoluteFill><svg width={width} height={height}>
    <circle cx={width / 2} cy={height / 2} r={r} fill="none" stroke={tint} strokeOpacity={0.18 * fade} strokeWidth={40 * fade + 6} />
    <circle cx={width / 2} cy={height / 2} r={r} fill="none" stroke={tint} strokeOpacity={0.9 * fade} strokeWidth={6 * fade + 1} />
  </svg></AbsoluteFill>;
}

// The terminal boots and answers.
function BootShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const on = ease(interpolate(f, [0, 5], [0, 1], clamp));
  const typedBy = 6 + shot.command.length * 1.4;
  const answer = Math.max(0, Math.min(shot.answer.length, Math.floor((f - typedBy - 3) * 1.4)));
  const tear = interpolate(f, [shot.frames - 5, shot.frames], [0, 1], clamp);
  const size = 7 * unit;
  const screen = <div style={{ display: "grid", gap: 1.6 * unit, filter: "drop-shadow(0 0 14px rgb(255 150 100 / .45))" }}>
    <Prompt text={shot.command} from={6} perChar={1.4} size={size} />
    <div style={{ font: `500 ${size}px/1.2 ${MONO}`, color: "#ffd9b8", textShadow: "0 0 18px rgb(255 160 110 / .8)", minHeight: "1.2em" }}>{shot.answer.slice(0, answer)}</div>
  </div>;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scaleY(${0.02 + 0.98 * on})`, filter: `brightness(${1 + (1 - on) * 2})` }}>
      {tear > 0 ? [0, 1, 2, 3, 4, 5].map((i) => {
        const shift = (random(`t${i}${Math.floor(f / 2)}`) - 0.5) * 30 * unit * tear;
        return <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: "center", clipPath: `inset(${i * 16.6}% 0 ${100 - (i + 1) * 16.6}% 0)`, transform: `translateX(${shift}px)` }}>{screen}</AbsoluteFill>;
      }) : screen}
    </AbsoluteFill>
    {/* A tube's scanlines and glow. */}
    <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgb(0 0 0 / .28) 0 2px, transparent 2px 4px)", mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgb(255 140 90 / .1), transparent 60%)" }} />
  </Cut>;
}

// The name slams in letter by letter, and the frame shakes.
function SlamShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const land = 7;
  const shake = f >= land ? Math.exp(-(f - land) / 4) : 0;
  const sx = (random(`sx${f}`) - 0.5) * 3 * unit * shake, sy = (random(`sy${f}`) - 0.5) * 3 * unit * shake;
  const rays = interpolate(f, [land - 1, land + 2, shot.frames], [0, 0.9, 0.25], clamp);
  const size = (portrait ? 15 : 13.5) * unit;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #2a140b, #08070a 60%)" }} />
    <AbsoluteFill style={{ opacity: rays, background: "repeating-conic-gradient(from 0deg, rgb(255 190 140 / .22) 0deg 2deg, transparent 2deg 9deg)", WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 55%)", maskImage: "radial-gradient(circle, #000 0%, transparent 55%)", transform: `rotate(${f * 0.4}deg) scale(1.6)` }} />
    <Shockwave at={land} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2.4 * unit, transform: `translate(${sx}px, ${sy}px)` }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: "92%", font: `400 ${size}px/0.92 ${ANTON}`, color: BONE, letterSpacing: "0.03em", textShadow: "0 0 60px rgb(255 160 110 / .45)" }}>
        {shot.text.split(" ").map((word, w, words) => <span key={w} style={{ display: "inline-flex", whiteSpace: "nowrap", marginRight: w < words.length - 1 ? "0.25em" : 0 }}>{Array.from(word).map((ch, k) => {
          const i = words.slice(0, w).join("").length + w + k;
          const u = ease(interpolate(f, [i * 0.5, i * 0.5 + 5], [0, 1], clamp));
          return <span key={k} style={{ display: "inline-block", opacity: u, transform: `scale(${2 - u}) translateY(${(1 - u) * -16}px)`, filter: u < 1 ? `blur(${(1 - u) * 8}px)` : "none" }}>{ch}</span>;
        })}</span>)}
      </div>
      <div style={{ font: `500 ${2.2 * unit}px/1 ${MONO}`, letterSpacing: "0.5em", textTransform: "uppercase", color: CORAL, opacity: interpolate(f, [land + 2, land + 8], [0, 0.9], clamp) }}>ansarbuilds</div>
    </AbsoluteFill>
  </Cut>;
}

// One word on the drum, each hitting its own way, over the tunnel.
function WordShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const size = (portrait ? 22 : 26) * unit;
  const u = ease(interpolate(f, [0, 5], [0, 1], clamp));
  const fill = shot.accent ? { color: "transparent", background: "linear-gradient(170deg, #fff4e6 15%, #ffc79a 50%, #d5360c 100%)", WebkitBackgroundClip: "text", backgroundClip: "text" } : { color: BONE };
  const base = { font: `400 ${size}px/0.9 ${ANTON}`, letterSpacing: "0.03em", textAlign: "center", padding: `0 ${4 * unit}px`, ...fill };
  let word;
  if (shot.style === "zoom") {
    const stroke = f < 4;
    word = <div style={{ ...base, color: stroke ? "transparent" : BONE, WebkitTextStroke: stroke ? `2px ${BONE}` : undefined, transform: `scale(${0.4 + 0.65 * u})` }}>{shot.text}</div>;
  } else if (shot.style === "slice") {
    const slices = 5;
    word = <div style={{ position: "relative" }}>{Array.from({ length: slices }, (_, i) => {
      const off = (random(`sl${i}`) - 0.5) * 40 * unit * (1 - u);
      return <div key={i} style={{ ...base, position: i ? "absolute" : "relative", inset: i ? 0 : undefined, clipPath: `inset(${(i / slices) * 100}% 0 ${100 - ((i + 1) / slices) * 100}% 0)`, transform: `translateX(${off}px)` }}>{shot.text}</div>;
    })}</div>;
  } else if (shot.style === "drop") {
    word = <div style={{ ...base, transform: `translateY(${(1 - u) * -60}%) scaleY(${1 + (1 - u) * 0.6})`, filter: `blur(${(1 - u) * 6}px)` }}>{shot.text}</div>;
  } else {
    word = <div style={{ ...base, transform: `scale(${2.6 - 1.6 * u})`, filter: `blur(${(1 - u) * 10}px)` }}>{shot.text}</div>;
  }
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #1d0f09, #08070a 70%)" }} />
    <Tunnel speed={1.6} tint={shot.accent ? CORAL : BONE} />
    <Shockwave at={0} frames={10} tint={shot.accent ? CORAL : BONE} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>{word}</AbsoluteFill>
  </Cut>;
}

// "Here are three", and the three named before they play.
function ThreeShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const slam = ease(interpolate(f, [0, 6], [0, 1], clamp));
  const watch = interpolate(f, [26, 31], [0, 1], clamp);
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #24120a, #08070a 65%)" }} />
    <Tunnel speed={0.5} />
    <Shockwave at={1} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3 * unit }}>
      <div style={{ font: `400 ${(portrait ? 15 : 16) * unit}px/0.9 ${ANTON}`, color: BONE, textAlign: "center", padding: `0 ${4 * unit}px`, textShadow: "0 0 60px rgb(255 160 110 / .45)", transform: `scale(${1.6 - 0.6 * slam})`, filter: `blur(${(1 - slam) * 14}px)`, opacity: slam }}>{shot.text}</div>
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: (portrait ? 1.6 : 2.4) * unit, alignItems: "center" }}>
        {shot.names.map((name, i) => {
          const u = ease(interpolate(f, [9 + i * 5, 15 + i * 5], [0, 1], clamp));
          return <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 1.2 * unit, padding: `${1.2 * unit}px ${2.4 * unit}px`, border: `1px solid rgb(255 200 160 / ${0.2 + 0.4 * u})`, borderRadius: 999, background: "rgb(20 12 8 / .7)", opacity: u, transform: `translateY(${(1 - u) * 30}px)` }}>
            <span style={{ font: `500 ${2.2 * unit}px/1 ${MONO}`, color: CORAL }}>0{i + 1}</span>
            <span style={{ font: `400 ${4.4 * unit}px/1 ${ANTON}`, color: BONE, letterSpacing: "0.04em", textTransform: "uppercase" }}>{name}</span>
          </div>;
        })}
      </div>
      <div style={{ font: `italic 400 ${6 * unit}px/1 ${SERIF}`, color: CORAL, opacity: watch }}>{shot.serif}</div>
    </AbsoluteFill>
  </Cut>;
}

/* ---- Hedwig ---- */

const NAVY = "#0b1226";
// A loss curve, as a height from the top of its box (1 is the top): it falls
// fast, then flattens, with a little noise. An illustration of the shape,
// not Hedwig's logged numbers, so it carries no figures of its own.
const lossAt = (u) => 1 - (0.12 + 0.82 * Math.exp(-4.2 * u) + 0.03 * Math.sin(u * 61) * (1 - u));

/* A training run: the command, a loss curve racing down and the parameter
   count climbing, then the name slams in and the count lands. */
function TrainShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const run = ease(interpolate(f, [4, 26], [0, 1], clamp));
  const slam = ease(interpolate(f, [26, 32], [0, 1], clamp));
  const line = interpolate(f, [31, 37], [0, 1], clamp);
  const count = Math.round(shot.params * run);
  // The curve, across the lower part of the frame.
  const box = portrait ? { x: width * 0.08, y: height * 0.62, w: width * 0.84, h: height * 0.22 } : { x: width * 0.52, y: height * 0.2, w: width * 0.42, h: height * 0.55 };
  const n = 80, upto = Math.max(2, Math.round(n * run));
  const pts = Array.from({ length: upto }, (_, i) => { const u = i / (n - 1); return `${box.x + u * box.w},${box.y + lossAt(u) * box.h}`; }).join(" ");
  const last = pts.split(" ").at(-1).split(",").map(Number);
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 70% 40%, #1c2550, ${NAVY} 65%)` }} />
    <AbsoluteFill style={{ opacity: 0.25, backgroundImage: "linear-gradient(rgb(232 176 74 / .12) 1px, transparent 1px), linear-gradient(90deg, rgb(232 176 74 / .12) 1px, transparent 1px)", backgroundSize: `${6 * unit}px ${6 * unit}px` }} />
    <AbsoluteFill><svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={shot.tint} strokeWidth={unit * 0.6} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 ${unit}px ${shot.tint})` }} opacity={1 - slam * 0.6} />
      <circle cx={last[0]} cy={last[1]} r={unit * 1.1} fill="#fff4e6" opacity={1 - slam * 0.6} />
      <text x={box.x} y={box.y - unit * 1.5} fill={shot.tint} fontFamily={MONO} fontSize={unit * 2} letterSpacing={unit * 0.3} opacity={1 - slam * 0.6}>LOSS</text>
    </svg></AbsoluteFill>
    <AbsoluteFill style={{ padding: portrait ? `${14 * unit}px ${7 * unit}px` : `${9 * unit}px ${8 * unit}px`, gap: 2.4 * unit }}>
      <Prompt text={shot.command} from={0} perChar={0.25} size={3 * unit} />
      <div style={{ font: `500 ${2 * unit}px/1 ${MONO}`, letterSpacing: "0.3em", color: shot.tint, marginTop: 3 * unit }}>PARAMETERS</div>
      <div style={{ font: `400 ${(portrait ? 12 : 14) * unit}px/1 ${ANTON}`, color: BONE, fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", textShadow: `0 0 40px ${shot.tint}66` }}>{slam > 0.5 ? "286.7M" : count.toLocaleString("en-US")}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 * unit, marginTop: 2 * unit, transform: `scale(${1.6 - 0.6 * slam})`, transformOrigin: "left center", opacity: slam, filter: `blur(${(1 - slam) * 12}px)` }}>
        <span style={{ font: `500 ${6 * unit}px/1 ${MONO}`, color: shot.tint }}>{shot.number}</span>
        <span style={{ font: `400 ${(portrait ? 20 : 22) * unit}px/0.9 ${ANTON}`, color: BONE, textShadow: `0 0 50px ${shot.tint}88` }}>{shot.name}</span>
      </div>
      <div style={{ font: `italic 400 ${(portrait ? 6 : 5) * unit}px/1.1 ${SERIF}`, color: BONE, opacity: line * 0.9 }}>{shot.line}</div>
    </AbsoluteFill>
    <Shockwave at={26} tint={shot.tint} />
  </Cut>;
}

/* Hedwig writing, for real: a run of its 13.8M model, token by token, with
   the three tokens it was choosing between at each step and their chances. */
function TokensShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const shown = Math.min(shot.count, Math.floor(interpolate(f, [3, shot.frames - 6], [0, shot.count], clamp)));
  const text = RUN.slice(0, shown).map(([t]) => t).join("");
  const step = RUN[Math.min(shown, shot.count - 1)];
  const [chosen, choices] = step;
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, #18204a, ${NAVY} 70%)` }} />
    <AbsoluteFill style={{ padding: portrait ? `${16 * unit}px ${7 * unit}px` : `${8 * unit}px ${10 * unit}px`, gap: 3 * unit, justifyContent: "center" }}>
      <div style={{ font: `500 ${2.2 * unit}px/1.4 ${MONO}`, color: "rgb(239 230 216 / .6)" }}><span style={{ color: shot.tint }}>prompt › </span>{PROMPT}</div>
      <div style={{ font: `italic 400 ${(portrait ? 7.5 : 6.4) * unit}px/1.18 ${SERIF}`, color: BONE, minHeight: "3.6em" }}>{text}<span style={{ display: "inline-block", width: "0.5em", height: "0.9em", marginLeft: 4, verticalAlign: "-0.1em", background: shot.tint, opacity: Math.floor(f / 4) % 2 ? 1 : 0.3 }} /></div>
      <div style={{ display: "grid", gap: 1 * unit, width: portrait ? "100%" : "52%" }}>
        {choices.map(([token, pct]) => <div key={token} style={{ display: "grid", gridTemplateColumns: `${14 * unit}px 1fr ${9 * unit}px`, alignItems: "center", gap: 1.5 * unit, font: `500 ${2.3 * unit}px/1 ${MONO}`, color: token === chosen ? "#fff4e6" : "rgb(239 230 216 / .55)" }}>
          <span>{JSON.stringify(token)}</span>
          <span style={{ height: 1.2 * unit, borderRadius: unit, background: "rgb(239 230 216 / .1)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${pct}%`, background: token === chosen ? shot.tint : "rgb(239 230 216 / .35)" }} /></span>
          <span style={{ textAlign: "right" }}>{pct}%</span>
        </div>)}
      </div>
      <div style={{ font: `500 ${1.8 * unit}px/1 ${MONO}`, letterSpacing: "0.25em", textTransform: "uppercase", color: shot.tint, opacity: 0.85 }}>A real run of the 13.8M model · its top three each step</div>
    </AbsoluteFill>
  </Cut>;
}

// A number slammed, and the receipts under it, one row at a time.
function ReceiptsShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const u = ease(interpolate(f, [0, 6], [0, 1], clamp));
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2 * unit, background: `radial-gradient(circle, ${shot.tint}30, transparent 55%), ${INK}` }}>
      <div style={{ font: `400 ${(portrait ? 30 : 30) * unit}px/0.9 ${ANTON}`, color: "transparent", background: `linear-gradient(170deg, #fffaf2 10%, ${shot.tint} 60%, #b8320e)`, WebkitBackgroundClip: "text", backgroundClip: "text", transform: `scale(${1.3 - 0.3 * u})` }}>{shot.value}</div>
      <div style={{ font: `500 ${2.8 * unit}px/1.2 ${MONO}`, letterSpacing: "0.18em", textTransform: "uppercase", color: BONE, opacity: interpolate(f, [3, 8], [0, 1], clamp) }}>{shot.label}</div>
      <div style={{ display: "grid", gap: 1.2 * unit, marginTop: 1.5 * unit, justifyItems: "center" }}>
        {shot.rows.map((row, i) => { const v = ease(interpolate(f, [8 + i * 5, 13 + i * 5], [0, 1], clamp)); return <div key={row} style={{ font: `500 ${2.6 * unit}px/1.2 ${MONO}`, color: shot.tint, opacity: v, transform: `translateY(${(1 - v) * 16}px)`, textAlign: "center" }}>{row}</div>; })}
      </div>
    </AbsoluteFill>
    <Shockwave at={0} tint={shot.tint} frames={12} />
  </Cut>;
}

/* ---- saywhen ---- */

const DUSK = "#140d05";

/* It listens only when the camera and the microphone agree: a face found
   and locked, lips moving, a voice heard, each lighting in turn as the state
   moves from Waiting to Listening and the waveform wakes. Then the name
   slams in. (An illustration of the idea, like the project's own film.) */
function ListenShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const [face, lips, voice] = shot.cues.map(([at]) => at);
  const lit = [face, lips, voice].map((at) => ease(interpolate(f, [at, at + 4], [0, 1], clamp)));
  const state = f >= voice ? 2 : f >= lips ? 1 : 0;
  const slam = ease(interpolate(f, [26, 32], [0, 1], clamp));
  const line = interpolate(f, [31, 37], [0, 1], clamp);
  const dim = 1 - slam * 0.55;
  // The reticle locks onto the face.
  const c = portrait ? { x: width / 2, y: height * 0.26, s: width * 0.42 } : { x: width * 0.73, y: height * 0.4, s: height * 0.46 };
  const lock = ease(interpolate(f, [face - 4, face + 1], [0, 1], clamp));
  const half = (c.s / 2) * (1.5 - 0.5 * lock), arm = c.s * 0.16;
  const talk = f >= lips ? Math.abs(Math.sin(f * 1.4)) * (0.6 + 0.4 * random(`m${f}`)) : 0;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy], i) => <path key={i} d={`M ${c.x + dx * half} ${c.y + dy * (half - arm)} L ${c.x + dx * half} ${c.y + dy * half} L ${c.x + dx * (half - arm)} ${c.y + dy * half}`} fill="none" stroke={lock > 0.9 ? shot.tint : BONE} strokeWidth={unit * 0.45} strokeOpacity={0.5 + 0.5 * lock} />);
  // The waveform along the bottom: a murmur, then a voice.
  const bars = 56, wave = { y: portrait ? height * 0.9 : height * 0.8, h: portrait ? height * 0.06 : height * 0.09, x: width * 0.06, w: width * 0.88 };
  const loud = interpolate(f, [voice - 1, voice + 4], [0.08, 1], clamp);
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${portrait ? "50% 26%" : "73% 40%"}, #3a2408, ${DUSK} 60%)` }} />
    <AbsoluteFill style={{ opacity: dim }}><svg width={width} height={height}>
      {corners}
      <g stroke={BONE} strokeOpacity={0.25 + 0.5 * lock} fill="none" strokeWidth={unit * 0.25}>
        <ellipse cx={c.x} cy={c.y} rx={c.s * 0.27} ry={c.s * 0.36} />
        {[-0.3, -0.1, 0.1, 0.3].map((v) => <line key={v} x1={c.x - c.s * 0.26} x2={c.x + c.s * 0.26} y1={c.y + v * c.s * 0.9} y2={c.y + v * c.s * 0.9} strokeOpacity={0.12} />)}
        <line x1={c.x} x2={c.x} y1={c.y - c.s * 0.36} y2={c.y + c.s * 0.36} strokeOpacity={0.12} />
      </g>
      <circle cx={c.x - c.s * 0.1} cy={c.y - c.s * 0.06} r={unit * 0.6} fill={BONE} opacity={lock} />
      <circle cx={c.x + c.s * 0.1} cy={c.y - c.s * 0.06} r={unit * 0.6} fill={BONE} opacity={lock} />
      <ellipse cx={c.x} cy={c.y + c.s * 0.17} rx={c.s * 0.08} ry={c.s * (0.008 + 0.045 * talk)} fill="none" stroke={f >= lips ? shot.tint : BONE} strokeWidth={unit * 0.35} opacity={0.4 + 0.6 * lock} />
      {Array.from({ length: bars }, (_, i) => {
        const amp = loud * (0.25 + 0.75 * Math.abs(Math.sin(i * 0.5 + f * 0.9) * Math.sin(i * 0.17 - f * 0.4))) * (0.6 + 0.4 * random(`w${i}${f}`));
        const h = Math.max(unit * 0.3, wave.h * amp), x = wave.x + (i / (bars - 1)) * wave.w;
        return <rect key={i} x={x - unit * 0.35} y={wave.y - h / 2} width={unit * 0.7} height={h} rx={unit * 0.35} fill={loud > 0.5 ? shot.tint : BONE} opacity={0.35 + 0.55 * loud} />;
      })}
    </svg></AbsoluteFill>
    {/* The three signals, under the face. */}
    <div style={{ position: "absolute", left: c.x, top: c.y + c.s * (portrait ? 0.72 : 0.7), transform: "translateX(-50%)", display: "flex", gap: 1.4 * unit, opacity: dim }}>
      {shot.signals.map((name, i) => <div key={name} style={{ display: "flex", alignItems: "center", gap: 0.8 * unit, padding: `${0.9 * unit}px ${1.6 * unit}px`, borderRadius: 999, border: `1px solid ${lit[i] > 0.5 ? shot.tint : "rgb(239 230 216 / .25)"}`, background: `rgb(242 169 59 / ${0.18 * lit[i]})`, font: `600 ${2 * unit}px/1 ${MONO}`, letterSpacing: "0.18em", color: lit[i] > 0.5 ? "#fff4e6" : "rgb(239 230 216 / .45)", transform: `scale(${1 + 0.25 * (1 - lit[i]) * (lit[i] > 0)})`, boxShadow: lit[i] > 0.5 ? `0 0 ${2 * unit}px ${shot.tint}66` : "none" }}>
        <span style={{ width: unit, height: unit, borderRadius: "50%", background: lit[i] > 0.5 ? shot.tint : "rgb(239 230 216 / .25)" }} />{name}
      </div>)}
    </div>
    <AbsoluteFill style={{ padding: portrait ? `${height * 0.56}px ${7 * unit}px 0` : `${9 * unit}px ${8 * unit}px`, gap: 2.2 * unit }}>
      <Prompt text={shot.command} from={0} perChar={0.3} size={3 * unit} />
      <div style={{ display: "flex", gap: 2 * unit, font: `600 ${2.2 * unit}px/1 ${MONO}`, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 2 * unit }}>
        {shot.states.map((name, i) => <span key={name} style={{ color: i === state ? "#fff4e6" : "rgb(239 230 216 / .3)", textShadow: i === state ? `0 0 ${1.5 * unit}px ${shot.tint}` : "none", borderBottom: `2px solid ${i === state ? shot.tint : "transparent"}`, paddingBottom: 0.6 * unit }}>{name}</span>)}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 * unit, marginTop: (portrait ? 3 : 8) * unit, transform: `scale(${1.6 - 0.6 * slam})`, transformOrigin: "left center", opacity: slam, filter: `blur(${(1 - slam) * 12}px)` }}>
        <span style={{ font: `500 ${6 * unit}px/1 ${MONO}`, color: shot.tint }}>{shot.number}</span>
        <span style={{ font: `400 ${(portrait ? 20 : 22) * unit}px/0.9 ${ANTON}`, color: BONE, textShadow: `0 0 50px ${shot.tint}88` }}>{shot.name}</span>
      </div>
      <div style={{ font: `italic 400 ${(portrait ? 6 : 5) * unit}px/1.1 ${SERIF}`, color: BONE, opacity: line * 0.9 }}>{shot.line}</div>
    </AbsoluteFill>
    <Shockwave at={26} tint={shot.tint} />
  </Cut>;
}

/* What you say, and what it types: each spoken line, its wrong words struck
   through, and the command that lands under it. The rows are the project's
   own examples of its clean-up pass. */
function CleanShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const strike = (text, part, u) => {
    const at = text.indexOf(part);
    return <>{text.slice(0, at)}<span style={{ color: shot.tint, textDecoration: u > 0 ? "line-through" : "underline", textDecorationThickness: 3, textUnderlineOffset: "0.15em" }}>{part}</span>{text.slice(at + part.length)}</>;
  };
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 30%, #2c1b06, ${DUSK} 65%)` }} />
    <AbsoluteFill style={{ padding: portrait ? `0 ${7 * unit}px` : `0 ${9 * unit}px`, justifyContent: "center", gap: (portrait ? 4.5 : 3) * unit }}>
      <div style={{ font: `600 ${2 * unit}px/1 ${MONO}`, letterSpacing: "0.24em", textTransform: "uppercase", color: shot.tint }}>You say <span style={{ color: BONE, opacity: 0.5 }}>→</span> saywhen types</div>
      {shot.rows.map(([said, typed, wrong, right, warn], i) => {
        const s = 2 + i * 12;
        const appear = ease(interpolate(f, [s, s + 4], [0, 1], clamp));
        const fix = ease(interpolate(f, [s + 6, s + 10], [0, 1], clamp));
        const warned = warn && ease(interpolate(f, [s + 11, s + 15], [0, 1], clamp));
        const at = typed.indexOf(right);
        return <div key={said} style={{ display: "grid", gridTemplateColumns: portrait ? "1fr" : "1fr 1fr", alignItems: "center", gap: (portrait ? 0.8 : 3) * unit, opacity: appear, transform: `translateY(${(1 - appear) * 20}px)` }}>
          <div style={{ font: `italic 400 ${(portrait ? 5.6 : 5.4) * unit}px/1.1 ${SERIF}`, color: BONE, opacity: 1 - 0.45 * fix }}>“{strike(said, wrong, fix)}”</div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.4 * unit, opacity: fix, transform: `scale(${1.25 - 0.25 * fix})`, transformOrigin: "left center" }}>
            <span style={{ font: `500 ${(portrait ? 3.8 : 4) * unit}px/1.2 ${MONO}`, color: BONE, whiteSpace: "nowrap" }}><span style={{ color: CORAL }}>$ </span>{typed.slice(0, at)}<span style={{ color: "#fff4e6", textShadow: `0 0 ${2 * unit}px ${shot.tint}` }}>{right}</span>{typed.slice(at + right.length)}</span>
            {warn && <span style={{ font: `600 ${1.7 * unit}px/1 ${MONO}`, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffb4a0", padding: `${0.7 * unit}px ${1.2 * unit}px`, border: "1px solid #ff6a4a", borderRadius: 999, opacity: warned, transform: `scale(${1.4 - 0.4 * warned})` }}>⚠ {warn}</span>}
          </div>
        </div>;
      })}
    </AbsoluteFill>
  </Cut>;
}

/* The send: the preview card, its countdown draining with every way to stop
   it named, then Enter pressed, in a trusted app. */
function SendShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const portrait = usePortrait();
  const left = interpolate(f, [2, shot.enterAt], [1, 0], clamp);
  const hit = ease(interpolate(f, [shot.enterAt, shot.enterAt + 4], [0, 1], clamp));
  const sent = f >= shot.enterAt;
  const shake = sent ? Math.exp(-(f - shot.enterAt) / 3) : 0;
  const sx = (random(`ss${f}`) - 0.5) * 2 * unit * shake;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #33200a, ${DUSK} 62%)` }} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 * unit, transform: `translateX(${sx}px)` }}>
      <div style={{ width: portrait ? "86%" : "64%", padding: 3 * unit, borderRadius: 2 * unit, background: "rgb(30 20 10 / .85)", border: `1px solid ${sent ? shot.tint : "rgb(239 230 216 / .18)"}`, boxShadow: sent ? `0 0 ${6 * unit}px ${shot.tint}55, 0 30px 80px rgb(0 0 0 / .6)` : "0 30px 80px rgb(0 0 0 / .6)", display: "grid", gap: 2.4 * unit }}>
        <div style={{ display: "flex", alignItems: "center", gap: unit, font: `600 ${1.8 * unit}px/1 ${MONO}`, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgb(239 230 216 / .7)" }}>
          <span style={{ width: unit, height: unit, borderRadius: "50%", background: shot.tint }} />{shot.app} · trusted
          <span style={{ marginLeft: "auto", color: sent ? shot.tint : "rgb(239 230 216 / .5)" }}>{sent ? "Sent" : "Preview"}</span>
        </div>
        <div style={{ font: `500 ${(portrait ? 4.6 : 5.2) * unit}px/1.2 ${MONO}`, color: BONE, whiteSpace: "nowrap" }}><span style={{ color: CORAL }}>$ </span>{shot.text}</div>
        <div style={{ height: 0.8 * unit, borderRadius: unit, background: "rgb(239 230 216 / .1)", overflow: "hidden" }}><div style={{ height: "100%", width: `${left * 100}%`, background: shot.tint }} /></div>
        <div style={{ font: `italic 400 ${(portrait ? 3.6 : 3) * unit}px/1.1 ${SERIF}`, color: BONE, opacity: sent ? 0.3 : 0.8 }}>Esc, shake your head, or say “cancel”.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 1.6 * unit, padding: `${1.8 * unit}px ${3.6 * unit}px`, borderRadius: 1.4 * unit, background: "linear-gradient(180deg, #fff4e6, #f2c27a)", boxShadow: `0 ${(1 - hit) * 1.4 * unit + 0.3 * unit}px 0 #8a5a1a, 0 0 ${5 * unit * hit}px ${shot.tint}`, font: `400 ${(portrait ? 5 : 6.5) * unit}px/1 ${ANTON}`, letterSpacing: "0.08em", color: INK, opacity: interpolate(f, [shot.enterAt - 6, shot.enterAt - 2], [0, 1], clamp), transform: `translateY(${hit * 1.2 * unit}px) scale(${sent ? 1.08 - 0.08 * hit : 1.15})` }}>↵ ENTER</div>
    </AbsoluteFill>
    <Shockwave at={shot.enterAt} tint={shot.tint} frames={12} />
  </Cut>;
}

/* ---- Haloscript ---- */

const NIGHT = "#100c1f";

/* The app opens: its icon pops in, the halo from the icon draws itself
   around it and throws out a ring of light, and the name slams in. */
function HaloShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const c = portrait ? { x: width / 2, y: height * 0.27 } : { x: width * 0.72, y: height * 0.44 };
  const tile = (portrait ? 30 : 26) * unit;
  const pop = interpolate(f, [5, 9, 12], [0, 1.12, 1], clamp);
  const draw = ease(interpolate(f, [8, 20], [0, 1], clamp));
  const glow = interpolate(f, [18, 22, shot.frames], [0, 1, 0.6], clamp);
  const slam = ease(interpolate(f, [24, 30], [0, 1], clamp));
  const line = interpolate(f, [29, 35], [0, 1], clamp);
  const ring = { rx: tile * 1.15, ry: tile * 0.3, cy: c.y + tile * 0.42 };
  const length = Math.PI * (3 * (ring.rx + ring.ry) - Math.sqrt((3 * ring.rx + ring.ry) * (ring.rx + 3 * ring.ry)));
  const wave = interpolate(f, [20, 34], [0, 1], clamp);
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${portrait ? "50% 27%" : "72% 44%"}, #2a1f4a, ${NIGHT} 60%)` }} />
    <AbsoluteFill style={{ opacity: glow * 0.8, background: "repeating-conic-gradient(from 0deg at " + (portrait ? "50% 27%" : "72% 44%") + ", rgb(220 205 255 / .16) 0deg 2deg, transparent 2deg 10deg)", WebkitMaskImage: `radial-gradient(circle at ${portrait ? "50% 27%" : "72% 44%"}, #000 0%, transparent 45%)`, maskImage: `radial-gradient(circle at ${portrait ? "50% 27%" : "72% 44%"}, #000 0%, transparent 45%)` }} />
    <AbsoluteFill><svg width={width} height={height}>
      {/* The halo, drawn around the icon, then a ring of it thrown out. */}
      <ellipse cx={c.x} cy={ring.cy} rx={ring.rx} ry={ring.ry} fill="none" stroke={shot.tint} strokeWidth={unit * 1.6} strokeOpacity={0.25} strokeDasharray={length} strokeDashoffset={length * (1 - draw)} style={{ filter: `blur(${unit * 0.8}px)` }} />
      <ellipse cx={c.x} cy={ring.cy} rx={ring.rx} ry={ring.ry} fill="none" stroke="#f3eeff" strokeWidth={unit * 0.5} strokeDasharray={length} strokeDashoffset={length * (1 - draw)} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${unit * 1.2}px ${shot.tint})` }} />
      {f >= 20 && wave < 1 && <ellipse cx={c.x} cy={ring.cy} rx={ring.rx * (1 + 2.6 * ease(wave))} ry={ring.ry * (1 + 2.6 * ease(wave))} fill="none" stroke={shot.tint} strokeWidth={unit * (0.2 + 1.4 * (1 - wave))} strokeOpacity={0.9 * (1 - wave)} />}
    </svg></AbsoluteFill>
    <div style={{ position: "absolute", left: c.x - tile / 2, top: c.y - tile / 2 - tile * 0.12, width: tile, height: tile, borderRadius: tile * 0.23, overflow: "hidden", transform: `scale(${pop})`, boxShadow: `0 ${2 * unit}px ${6 * unit}px rgb(0 0 0 / .6), 0 0 ${8 * unit * glow}px ${shot.tint}88` }}>
      <Img src={staticFile("halo-icon.png")} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
    <AbsoluteFill style={{ padding: portrait ? `${height * 0.53}px ${7 * unit}px 0` : `${9 * unit}px ${8 * unit}px`, gap: 2.2 * unit }}>
      <Prompt text={shot.command} from={0} perChar={0.3} size={3 * unit} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 * unit, marginTop: (portrait ? 3 : 14) * unit, transform: `scale(${1.6 - 0.6 * slam})`, transformOrigin: "left center", opacity: slam, filter: `blur(${(1 - slam) * 12}px)` }}>
        <span style={{ font: `500 ${6 * unit}px/1 ${MONO}`, color: shot.tint }}>{shot.number}</span>
        <span style={{ font: `400 ${(portrait ? Math.min(20, 118 / shot.name.length) : 17) * unit}px/0.9 ${ANTON}`, color: BONE, textShadow: `0 0 50px ${shot.tint}88` }}>{shot.name}</span>
      </div>
      <div style={{ font: `italic 400 ${(portrait ? 6 : 5) * unit}px/1.1 ${SERIF}`, color: BONE, opacity: line * 0.9 }}>{shot.line}</div>
    </AbsoluteFill>
    <Shockwave at={24} tint={shot.tint} />
  </Cut>;
}

/* One app, three screens: the frame turns from a Mac into an iPad into an
   iPhone, its screen changing with it, on two beats. */
function MorphShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const turns = [[8, 13], [19, 24]];
  // How far along the three screens it is: 0 the Mac, 1 the iPad, 2 the iPhone.
  const along = turns.reduce((sum, [a, b]) => sum + ease(interpolate(f, [a, b], [0, 1], clamp)), 0);
  const shapes = shot.screens.map(([, device]) => SHAPE[device]);
  const mix = (key) => { const i = Math.min(1, Math.floor(along)), u = along - i; return shapes[i][key] + (shapes[Math.min(2, i + 1)][key] - shapes[i][key]) * u; };
  const ratio = Math.exp(mix("ratioLog"));
  const maxW = portrait ? width * 0.84 : width * 0.62, maxH = portrait ? height * 0.56 : height * 0.56;
  const w = Math.min(maxW, maxH * ratio), h = w / ratio;
  const spin = turns.reduce((sum, [a, b]) => sum + Math.sin(Math.PI * interpolate(f, [a, b], [0, 1], clamp)), 0);
  const now = Math.round(along);
  return <Cut hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #2a2145, ${NIGHT} 65%)` }} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3.5 * unit }}>
      <div style={{ font: `italic 400 ${(portrait ? 6.5 : 5) * unit}px/1 ${SERIF}`, color: BONE, opacity: interpolate(f, [2, 7], [0, 0.9], clamp) }}>{shot.line}</div>
      <div style={{ width: w, height: h, padding: mix("pad") * unit, borderRadius: mix("radius") * unit, background: "linear-gradient(160deg, #2e2a3a, #0c0c10)", boxShadow: `0 40px 80px rgb(0 0 0 / .6), inset 0 0 0 1px rgb(255 255 255 / .08), 0 0 ${6 * unit * spin}px ${shot.tint}66`, transform: `perspective(1400px) rotateY(${spin * 18}deg) scale(${1 + 0.06 * spin})`, boxSizing: "border-box" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: (mix("radius") - mix("pad") / 2) * unit, overflow: "hidden" }}>
          {shot.screens.map(([src], i) => <Img key={src} src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: Math.max(0, 1 - Math.abs(along - i)) }} />)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 3 * unit, font: `600 ${2.4 * unit}px/1 ${MONO}`, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        {shot.screens.map(([, , name], i) => <span key={name} style={{ color: i === now ? "#f3eeff" : "rgb(239 230 216 / .3)", textShadow: i === now ? `0 0 ${1.5 * unit}px ${shot.tint}` : "none", borderBottom: `2px solid ${i === now ? shot.tint : "transparent"}`, paddingBottom: 0.6 * unit }}>{name}</span>)}
      </div>
    </AbsoluteFill>
  </Cut>;
}
for (const shape of Object.values(SHAPE)) shape.ratioLog = Math.log(shape.ratio);

/* A word written on the Mac goes up to the writer's own iCloud and comes
   down on the iPad and the iPhone; then what is not in the way. */
function SyncShot({ shot }) {
  const f = useCurrentFrame();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const portrait = usePortrait();
  const s = portrait ? width / 720 : width / 1280;
  const L = portrait
    ? { cloud: [360, 250], mac: [360, 560, 520], ipad: [235, 905, 210], iphone: [500, 905, 132], promises: 1130 }
    : { cloud: [640, 150], mac: [330, 430, 400], ipad: [800, 440, 200], iphone: [1010, 440, 124], promises: 600 };
  const dev = (key, src, device) => { const [x, y, w] = L[key]; const h = w / SHAPE[device].ratio; return { x: x * s, y: y * s, w: w * s, h: h * s, src, device }; };
  const mac = dev("mac", "halo-home-mac.jpg", "mac"), ipad = dev("ipad", "halo-write-ipad.jpg", "ipadUp"), iphone = dev("iphone", "halo-write-iphone.jpg", "iphone");
  const cloud = { x: L.cloud[0] * s, y: L.cloud[1] * s };
  const [upAt, downAt] = shot.cues.map(([at]) => at);
  const typed = Math.floor(interpolate(f, [1, upAt - 4], [0, shot.word.length], clamp));
  const up = interpolate(f, [upAt - 4, upAt], [0, 1], clamp);
  const down = interpolate(f, [upAt, downAt], [0, 1], clamp);
  const got = f >= downAt;
  const pulse = (from, to, u, key) => u > 0 && u < 1 && <g key={key}>
    <line x1={from[0]} y1={from[1]} x2={from[0] + (to[0] - from[0]) * u} y2={from[1] + (to[1] - from[1]) * u} stroke={shot.tint} strokeWidth={unit * 0.4} strokeOpacity={0.6} />
    <circle cx={from[0] + (to[0] - from[0]) * u} cy={from[1] + (to[1] - from[1]) * u} r={unit * 1.1} fill="#f3eeff" style={{ filter: `drop-shadow(0 0 ${unit}px ${shot.tint})` }} />
  </g>;
  const top = (d) => [d.x, d.y - d.h / 2 - 5 * unit];
  const chip = (d, on, key) => <div key={key} style={{ position: "absolute", left: d.x, top: d.y - d.h / 2 - 5.5 * unit, transform: `translate(-50%, -50%) scale(${on ? 1 : 0.6})`, opacity: on ? 1 : 0, padding: `${0.8 * unit}px ${1.6 * unit}px`, borderRadius: 999, border: `1px solid ${shot.tint}`, background: "rgb(16 12 31 / .9)", font: `italic 400 ${2.8 * unit}px/1 ${SERIF}`, color: "#f3eeff", whiteSpace: "nowrap", boxShadow: `0 0 ${2 * unit}px ${shot.tint}66` }}>{key === "mac" ? shot.word.slice(0, typed) : shot.word}</div>;
  return <Cut still hit={shot.hit}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 20%, #2a2145, ${NIGHT} 65%)` }} />
    {[mac, ipad, iphone].map((d, i) => <div key={d.src} style={{ position: "absolute", left: d.x - d.w / 2, top: d.y - d.h / 2, filter: i && got ? `drop-shadow(0 0 ${3 * unit}px ${shot.tint})` : "none" }}><Device src={d.src} device={d.device} width={d.w} /></div>)}
    <AbsoluteFill><svg width={width} height={height}>
      <g transform={`translate(${cloud.x} ${cloud.y}) scale(${unit * 0.11})`} style={{ filter: `drop-shadow(0 0 ${unit * (up >= 1 ? 2 : 0.6)}px ${shot.tint})` }}>
        <path d="M -60 25 A 25 25 0 0 1 -48 -18 A 38 38 0 0 1 22 -32 A 30 30 0 0 1 62 25 Z" fill="#1d1638" stroke="#f3eeff" strokeWidth={4} strokeLinejoin="round" />
      </g>
      {pulse(top(mac), [cloud.x, cloud.y + 1.5 * unit], up, "up")}
      {pulse([cloud.x, cloud.y + 1.5 * unit], top(ipad), down, "a")}
      {pulse([cloud.x, cloud.y + 1.5 * unit], top(iphone), down, "b")}
    </svg></AbsoluteFill>
    <div style={{ position: "absolute", left: cloud.x, top: cloud.y + 8 * unit, transform: "translateX(-50%)", font: `600 ${1.9 * unit}px/1 ${MONO}`, letterSpacing: "0.22em", textTransform: "uppercase", color: shot.tint, whiteSpace: "nowrap" }}>Your own iCloud</div>
    {chip(mac, typed > 0, "mac")}{chip(ipad, got, "ipad")}{chip(iphone, got, "iphone")}
    <div style={{ position: "absolute", left: 0, right: 0, top: L.promises * s, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1.6 * unit, padding: `0 ${5 * unit}px` }}>
      {shot.promises.map((p, i) => { const v = ease(interpolate(f, [downAt + 2 + i * 3, downAt + 6 + i * 3], [0, 1], clamp)); return <span key={p} style={{ font: `600 ${2.2 * unit}px/1 ${MONO}`, letterSpacing: "0.16em", textTransform: "uppercase", color: BONE, padding: `${1 * unit}px ${1.8 * unit}px`, border: "1px solid rgb(201 184 255 / .5)", borderRadius: 999, opacity: v, transform: `translateY(${(1 - v) * 14}px)` }}>{p}</span>; })}
    </div>
  </Cut>;
}

const SHOT = { more: MoreShot, halo: HaloShot, morph: MorphShot, sync: SyncShot, listen: ListenShot, clean: CleanShot, send: SendShot, train: TrainShot, tokens: TokensShot, receipts: ReceiptsShot, boot: BootShot, slam: SlamShot, word: WordShot, three: ThreeShot, type: TypeShot, term: TermShot, title: TitleShot, clip: ClipShot, stat: StatShot, device: DeviceShot, trio: TrioShot, end: EndShot };

// Over every shot: the project's tag at the corner, grain and a vignette.
function Chrome() {
  const f = useCurrentFrame();
  const unit = useUnit();
  const cut = CUTS.find((c) => f >= c.start && f < c.end) ?? CUTS.at(-1);
  const title = CUTS.find((c) => c.chapter === cut.chapter && ["title", "train", "listen", "halo"].includes(c.kind));
  const showTag = title && !["title", "train", "listen", "halo"].includes(cut.kind);
  return <>
    {showTag && <div style={{ position: "absolute", left: 4 * unit, top: 4 * unit, display: "flex", alignItems: "center", gap: 1.2 * unit, font: `600 ${1.9 * unit}px/1 ${MONO}`, letterSpacing: "0.2em", textTransform: "uppercase", color: BONE, textShadow: "0 1px 8px #000" }}>
      <span style={{ width: 1.2 * unit, height: 1.2 * unit, borderRadius: "50%", background: Math.floor(f / 8) % 2 ? CORAL : "#7a2a14" }} />{title.number} / {title.name}
    </div>}
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, transparent 55%, rgb(0 0 0 / .55))", pointerEvents: "none" }} />
    <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: "overlay" }}>
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
