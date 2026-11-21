import "./film.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ACT_ONE, ACTS, SETS, TIMELINE_SHOTS } from "./shots";
import { buildTimeline, entryAtTime, poseAt, scrollAtTime, timeAtScroll, timecode } from "./rig";

/* The moving pre-vis: the camera flies the real path through a grey-box
   world, driven by the scrollbar, with the shot, timecode and title cards
   over the top. Nothing here is final art. It exists to judge order, pace
   and camera moves before the scenes are built. Development only. */

const TIMELINE = buildTimeline(TIMELINE_SHOTS);
const BONE = "#efe6d8";
const SIGNAL = "#ff8a5f";

/* ---------- world ---------- */

// A soft round glow, drawn once and shared.
let glowTexture = null;
function getGlow() {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,170,130,.75)");
  gradient.addColorStop(1, "rgba(255,138,95,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

function Glow({ position = [0, 0, 0], size = 6 }) {
  return <sprite position={position} scale={[size, size, 1]}><spriteMaterial map={getGlow()} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>;
}

// Text on a flat card that always faces the camera.
function Label({ text, position, height = 2.4, color = BONE, font = "Anton" }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const setFont = () => { context.font = `400 96px ${font}, sans-serif`; };
    setFont();
    canvas.width = Math.ceil(context.measureText(text).width) + 40;
    canvas.height = 128;
    setFont();
    context.fillStyle = color;
    context.textBaseline = "middle";
    context.fillText(text, 20, 68);
    return { texture: new THREE.CanvasTexture(canvas), aspect: canvas.width / canvas.height };
  }, [text, color, font]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[height * aspect, height, 1]}><spriteMaterial map={texture} transparent depthWrite={false} /></sprite>;
}

function Box({ size, position = [0, 0, 0], color = BONE, opacity = 0.7 }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size]);
  useEffect(() => () => edges.dispose(), [edges]);
  return <lineSegments geometry={edges} position={position}><lineBasicMaterial color={color} transparent opacity={opacity} /></lineSegments>;
}

function scatter(count, seed, place) {
  let state = seed;
  const next = () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296; };
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) positions.set(place(next), i * 3);
  return positions;
}
function Cloud({ positions, size, color = BONE, opacity = 0.8 }) {
  return <points>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial size={size} color={color} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
  </points>;
}

const LAST_Z = SETS.point.at[2];
const DUST = scatter(5200, 11, (next) => { const angle = next() * Math.PI * 2, reach = 18 + next() * 150; return [Math.cos(angle) * reach, Math.sin(angle) * reach * 0.55, 110 + next() * (LAST_Z - 190)]; });
const NETWORK = scatter(1800, 5, (next) => { const angle = next() * Math.PI * 2, tilt = Math.acos(2 * next() - 1), reach = 30 * Math.cbrt(next()); return [Math.sin(tilt) * Math.cos(angle) * reach * 1.5, Math.cos(tilt) * reach * 0.55, Math.sin(tilt) * Math.sin(angle) * reach]; });
const NETWORK_LINKS = (() => { const lines = []; for (let i = 0; i < 520; i++) { const a = (i * 7) % 1800, b = (i * 13 + 5) % 1800; lines.push(NETWORK[a * 3], NETWORK[a * 3 + 1], NETWORK[a * 3 + 2], NETWORK[b * 3], NETWORK[b * 3 + 1], NETWORK[b * 3 + 2]); } return new Float32Array(lines); })();

const NUMBERS = ["10+", "2", "3", "2"].map((text, i) => [text, ACT_ONE.numbers[i]]);
const PROJECT_SLUGS = Object.keys(SETS).filter((key) => !["monoliths", "star", "solar", "ribbon", "head", "point"].includes(key));

function Sets() {
  const at = (key, dx = 0, dy = 0, dz = 0) => [SETS[key].at[0] + dx, SETS[key].at[1] + dy, SETS[key].at[2] + dz];
  return <>
    {PROJECT_SLUGS.map((slug) => <group key={slug}>
      <Box size={[16, 9, 0.6]} position={at(slug)} />
      <Box size={[26, 0.2, 18]} position={at(slug, 0, -5.5)} opacity={0.3} />
      <Glow position={at(slug)} size={10} />
      <Label text={SETS[slug].label.toUpperCase()} position={at(slug, 0, 7.5)} />
    </group>)}
    {[-11, 0, 11].map((dx, i) => <Box key={dx} size={[6, 20 + i * 4, 6]} position={at("monoliths", dx, 10 + i * 2)} />)}
    <Label text="AGENTS · RESEARCH · SHIPPING" position={at("monoliths", 0, 30)} height={2} />
    <mesh position={at("star")}><sphereGeometry args={[6, 16, 10]} /><meshBasicMaterial color={SIGNAL} wireframe transparent opacity={0.5} /></mesh>
    <Glow position={at("star")} size={20} />
    <mesh position={at("solar")}><sphereGeometry args={[4, 16, 10]} /><meshBasicMaterial color={SIGNAL} wireframe /></mesh>
    {[10, 17, 25].map((radius) => <mesh key={radius} position={at("solar")} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, 0.05, 6, 96]} /><meshBasicMaterial color={BONE} transparent opacity={0.5} /></mesh>)}
    <Label text="SOLAR SYSTEM" position={at("solar", 0, 9)} height={2} />
    <mesh position={at("ribbon")} rotation={[0.3, 0.6, 0]}><torusKnotGeometry args={[7, 0.25, 160, 8, 2, 1]} /><meshBasicMaterial color={SIGNAL} wireframe transparent opacity={0.7} /></mesh>
    <mesh position={at("head", 0, 1.5)}><sphereGeometry args={[3, 14, 10]} /><meshBasicMaterial color={BONE} wireframe transparent opacity={0.6} /></mesh>
    <mesh position={at("head", 6, -1.6)}><sphereGeometry args={[1.4, 12, 8]} /><meshBasicMaterial color={SIGNAL} wireframe /></mesh>
    <Label text="HEAD + BB-8" position={at("head", 0, 7)} height={1.8} />
    <Glow position={at("point")} size={5} />
    <Glow position={ACT_ONE.tools.at} size={8} />
    {ACT_ONE.tools.rings.map((radius) => <mesh key={radius} position={ACT_ONE.tools.at} rotation={[Math.PI / 2 - 0.35, 0, 0]}><torusGeometry args={[radius, 0.04, 6, 96]} /><meshBasicMaterial color={BONE} transparent opacity={0.4} /></mesh>)}
    <Label text="TOOLS" position={[ACT_ONE.tools.at[0], ACT_ONE.tools.at[1] + 6, ACT_ONE.tools.at[2]]} height={1.8} />
  </>;
}

// Things that only exist from a certain shot on.
const NAME_FROM = TIMELINE.entries.find((entry) => entry.shot.id === "CO-05").t0;
const NETWORK_FROM = TIMELINE.entries.find((entry) => entry.shot.id === "CO-03").t0;
const SIGNAL_FROM = TIMELINE.entries.find((entry) => entry.shot.id === "CO-02").t0;

function World({ time }) {
  const name = useRef(null), network = useRef(null), signal = useRef(null);
  useFrame(() => {
    if (name.current) name.current.visible = time.current >= NAME_FROM;
    if (signal.current) signal.current.visible = time.current >= SIGNAL_FROM;
    if (network.current) {
      network.current.visible = time.current >= NETWORK_FROM;
      // The network grows out of the signal during the heartbeat and pull back.
      network.current.scale.setScalar(Math.min(1, Math.max(0.02, (time.current - NETWORK_FROM) / 2.2)));
    }
  });
  return <>
    <Cloud positions={DUST} size={0.5} opacity={0.55} />
    <group ref={signal}><Glow size={7} /></group>
    <group ref={network}>
      <Cloud positions={NETWORK} size={0.45} />
      <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[NETWORK_LINKS, 3]} /></bufferGeometry><lineBasicMaterial color={BONE} transparent opacity={0.07} /></lineSegments>
    </group>
    <group ref={name}><Label text="MOHAMED ANSAR" position={[0, 0, 0]} height={8.5} /></group>
    {NUMBERS.map(([text, position], i) => <Label key={i} text={text} position={position} height={7} color={i === 0 ? SIGNAL : BONE} />)}
    <Sets />
  </>;
}

/* The camera follows the rig's pose. A little damping takes the stepping
   out of wheel scrolling; a cut snaps, because easing across a cut would
   show the trip between two places the film never travels. */
function CameraRig({ time }) {
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const lastShot = useRef(-1);
  const target = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() }), []);
  useFrame(({ camera }, delta) => {
    const pose = poseAt(TIMELINE, time.current);
    target.pos.fromArray(pose.pos);
    target.look.fromArray(pose.look);
    const jumped = pose.entry.index !== lastShot.current && (lastShot.current === -1 || Math.abs(pose.entry.index - lastShot.current) > 1 || pose.entry.shot.cut || TIMELINE.entries[lastShot.current]?.shot.cut);
    lastShot.current = pose.entry.index;
    const blend = jumped ? 1 : 1 - Math.exp(-delta * 9);
    camera.position.lerp(target.pos, blend);
    look.current.lerp(target.look, blend);
    camera.lookAt(look.current);
    if (Math.abs(camera.fov - pose.fov) > 0.01) { camera.fov += (pose.fov - camera.fov) * blend; camera.updateProjectionMatrix(); }
  });
  return null;
}

/* ---------- page ---------- */

const screenHeight = () => window.innerHeight;
const actTitle = (id) => ACTS.find((act) => act.id === id)?.title ?? id;

export default function Previs() {
  const time = useRef(0);
  const clock = useRef(null);
  const playhead = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const entry = TIMELINE.entries[index];
  const { shot } = entry;

  // The scrollbar is the playhead.
  useEffect(() => {
    const read = () => {
      time.current = timeAtScroll(TIMELINE, window.scrollY / screenHeight());
      if (clock.current) clock.current.textContent = timecode(time.current);
      if (playhead.current) playhead.current.style.transform = `translateX(${(time.current / TIMELINE.seconds) * 100}%)`;
      setIndex(entryAtTime(TIMELINE, time.current).index);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => { window.removeEventListener("scroll", read); window.removeEventListener("resize", read); };
  }, []);

  const jumpTo = useCallback((seconds) => {
    // The scrollbar moves in whole pixels, so round up and add one: the
    // playhead then lands inside the shot, not on the end of the one before.
    window.scrollTo({ top: Math.ceil(scrollAtTime(TIMELINE, seconds) * screenHeight()) + 1, behavior: "instant" });
  }, []);

  // /previs/#A2-03b opens on that shot.
  useEffect(() => {
    const fromHash = () => {
      const found = TIMELINE.entries.find((candidate) => candidate.shot.id === window.location.hash.slice(1));
      if (found) requestAnimationFrame(() => jumpTo(found.t0));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [jumpTo]);

  // Play runs the film at its real speed by moving the scrollbar.
  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0, last = performance.now();
    const tick = (now) => {
      const next = time.current + (now - last) / 1000;
      last = now;
      if (next >= TIMELINE.seconds) { setPlaying(false); return; }
      window.scrollTo({ top: scrollAtTime(TIMELINE, next) * screenHeight(), behavior: "instant" });
      // Read it back from the scrollbar next frame, but keep sub-pixel time.
      time.current = next;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const step = useCallback((by) => {
    const next = TIMELINE.entries[Math.min(TIMELINE.entries.length - 1, Math.max(0, entryAtTime(TIMELINE, time.current).index + by))];
    setPlaying(false);
    jumpTo(next.t0);
  }, [jumpTo]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.target.closest?.("input, textarea, [contenteditable]") || event.metaKey || event.ctrlKey) return;
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === " ") { event.preventDefault(); setPlaying((on) => !on); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  return <div className="pv" style={{ height: `${(TIMELINE.screens + 1) * 100}vh` }}>
    <div className="pv-stage">
      <Canvas className="pv-canvas" dpr={[1, 2]} camera={{ fov: 36, near: 0.1, far: 4000, position: [0, 0, 3] }} gl={{ antialias: true }} fallback={<p className="pv-nowebgl">This pre-vis needs WebGL. The storyboard has every shot as a drawing.</p>}>
        <color attach="background" args={["#040404"]} />
        <fog attach="fog" args={["#040404", 60, 210]} />
        <CameraRig time={time} />
        <World time={time} />
      </Canvas>

      <div className={`pv-bars ${shot.bars ? "is-closed" : ""}`} aria-hidden="true"><span /><span /></div>
      {shot.text && <p key={shot.id} className="pv-card">{shot.text}</p>}

      <header className="pv-hud pv-hud-top">
        <div><p className="pv-kicker">Pre-vis · grey-box, not final art</p><h1><span>{shot.id}</span>{shot.title}</h1><p className="pv-act">{actTitle(shot.act)}</p></div>
        <div className="pv-clock"><strong ref={clock}>00:00.0</strong><span>/ {timecode(TIMELINE.seconds)}</span><a href={`/storyboard/#${shot.id}`}>Storyboard</a></div>
      </header>

      <footer className="pv-hud pv-hud-bottom">
        <p className="pv-action"><strong>{shot.camera.move}.</strong> {shot.action}</p>
        <div className="pv-controls">
          <button type="button" onClick={() => step(-1)} aria-label="Previous shot">←</button>
          <button type="button" className="pv-play" onClick={() => setPlaying((on) => !on)}>{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => step(1)} aria-label="Next shot">→</button>
          <span>Scroll, or Space and the arrow keys</span>
        </div>
        <div className="pv-track">
          {TIMELINE.entries.map((item) => <button key={item.shot.id} type="button" title={`${item.shot.id} · ${item.shot.title}`} aria-label={`Go to ${item.shot.id}, ${item.shot.title}`} className={`pv-seg pv-seg-${item.shot.act} ${item.index === index ? "is-on" : ""}`} style={{ flexGrow: item.shot.seconds }} onClick={() => { setPlaying(false); jumpTo(item.t0); }} />)}
          <span className="pv-playhead" ref={playhead} aria-hidden="true"><i /></span>
        </div>
      </footer>
    </div>
  </div>;
}
