import { useEffect, useRef } from "react";

/* The hero backdrop: a slowly turning sphere of nodes, wired to their
   nearest neighbours, with bright signals running along the wires like
   messages between agents. The pointer tilts the sphere and lights the
   nodes it passes, and a click sends a burst of signals out from the
   nearest node. Fine dust drifts behind it for depth. A single still frame is drawn for reduced motion, and
   the loop stops while the hero is off screen or the tab is hidden. */

const INK = [239, 230, 216];
const SIGNALS = [[255, 138, 95], [255, 196, 120], [120, 220, 255]];
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function buildSphere(count) {
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = GOLDEN * i;
    // A little jitter so it reads as a network, not a lattice.
    const j = 0.07;
    nodes.push([Math.cos(t) * r + (Math.random() - 0.5) * j, y + (Math.random() - 0.5) * j, Math.sin(t) * r + (Math.random() - 0.5) * j]);
  }
  const edges = new Set();
  nodes.forEach((a, i) => {
    nodes
      .map((b, k) => [k, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2])
      .filter(([k]) => k !== i)
      .sort((p, q) => p[1] - q[1])
      .slice(0, 4)
      .forEach(([k]) => edges.add(i < k ? `${i}-${k}` : `${k}-${i}`));
  });
  return { nodes, edges: [...edges].map((key) => key.split("-").map(Number)) };
}

export default function SignalField({ className = "", quiet = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, narrow = false;
    let sphere = null;
    let raf = 0, running = false, visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -9999, py: -9999 };
    const pulses = [];
    // Dust: slow specks behind the sphere, in unit coordinates.
    const dust = Array.from({ length: quiet ? 40 : 90 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.1, v: 0.004 + Math.random() * 0.012, a: 0.12 + Math.random() * 0.4 }));
    let projectedNow = [];
    let lastSpawn = 0;
    const start = performance.now();

    function resize() {
      const box = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(box.width * dpr));
      h = Math.max(1, Math.round(box.height * dpr));
      canvas.width = w;
      canvas.height = h;
      const wasNarrow = narrow;
      narrow = box.width < 760;
      if (!sphere || wasNarrow !== narrow) {
        sphere = buildSphere(narrow ? 120 : 240);
        // Signals in flight point at the old node set, so drop them.
        pulses.length = 0;
        projectedNow = [];
      }
    }

    function draw(now) {
      const t = (now - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      const ry = t * 0.07 + pointer.x * 0.5;
      const rx = -0.25 + pointer.y * 0.35;
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      const R = Math.min(w * (narrow ? 0.42 : 0.28), h * 0.34);
      const ox = narrow ? w * 0.5 : w * 0.7;
      const oy = narrow ? h * 0.36 : h * 0.48;
      const focal = 2.6;

      const projected = sphere.nodes.map(([x, y, z]) => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y1 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const s = focal / (focal + z2);
        return [ox + x1 * R * s, oy + y1 * R * s, z2, s];
      });

      projectedNow = projected;
      ctx.clearRect(0, 0, w, h);

      for (const speck of dust) {
        const dy = (speck.y - t * speck.v) % 1;
        const twinkle = 0.6 + Math.sin(t * 1.3 + speck.x * 40) * 0.4;
        ctx.fillStyle = `rgba(${INK},${(speck.a * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(speck.x * w + pointer.x * -30 * speck.r * dpr, (dy < 0 ? dy + 1 : dy) * h, speck.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // A warm core, breathing slowly.
      const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 1.25);
      core.addColorStop(0, `rgba(255,120,70,${(0.16 + Math.sin(t * 0.8) * 0.04).toFixed(3)})`);
      core.addColorStop(0.55, "rgba(255,120,70,0.05)");
      core.addColorStop(1, "rgba(255,120,70,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      // Orbit rings behind the sphere.
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(-0.35 + pointer.x * 0.1);
      ctx.strokeStyle = `rgba(${INK},0.14)`;
      ctx.lineWidth = dpr;
      for (const k of [1.32, 1.62]) {
        ctx.beginPath();
        ctx.ellipse(0, 0, R * k, R * k * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // A satellite on the inner ring.
      const a = t * 0.5;
      ctx.fillStyle = "rgba(255,138,95,0.95)";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 1.32, Math.sin(a) * R * 1.32 * 0.28, 2.6 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Wires: brighter at the front of the sphere.
      ctx.lineWidth = Math.max(1, 0.9 * dpr);
      for (const [i, k] of sphere.edges) {
        const p = projected[i], q = projected[k];
        const depth = 1 - ((p[2] + q[2]) / 2 + 1) / 2;
        ctx.strokeStyle = `rgba(${INK},${(0.05 + depth * 0.32).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      }

      // Nodes, lit up near the pointer.
      for (const [x, y, z, s] of projected) {
        const depth = 1 - (z + 1) / 2;
        const near = Math.max(0, 1 - Math.hypot(x - pointer.px, y - pointer.py) / (140 * dpr));
        ctx.fillStyle = near > 0.05 ? `rgba(255,138,95,${(0.45 + near * 0.55).toFixed(3)})` : `rgba(${INK},${(0.25 + depth * 0.75).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, (1 + depth * 1.9 + near * 2.4) * s * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Signals: spawn on random wires, travel end to end, fade out.
      if (!reduced && now - lastSpawn > (narrow ? 160 : 80) && pulses.length < (quiet ? 12 : narrow ? 18 : 40)) {
        lastSpawn = now;
        pulses.push({ edge: sphere.edges[Math.floor(Math.random() * sphere.edges.length)], t: 0, speed: 0.6 + Math.random() * 0.9, color: SIGNALS[Math.floor(Math.random() * SIGNALS.length)], hops: 2 + Math.floor(Math.random() * 4) });
      }
      ctx.globalCompositeOperation = "lighter";
      for (let n = pulses.length - 1; n >= 0; n -= 1) {
        const pulse = pulses[n];
        pulse.t += pulse.speed / 60;
        if (pulse.t >= 1) {
          // Hop on to a wire that starts where this one ended.
          pulse.hops -= 1;
          const end = pulse.edge[1];
          const next = sphere.edges.filter(([i, k]) => i === end || k === end);
          if (pulse.hops <= 0 || !next.length) { pulses.splice(n, 1); continue; }
          const pick = next[Math.floor(Math.random() * next.length)];
          pulse.edge = pick[0] === end ? pick : [pick[1], pick[0]];
          pulse.t = 0;
        }
        const p = projected[pulse.edge[0]], q = projected[pulse.edge[1]];
        if (!p || !q) { pulses.splice(n, 1); continue; }
        const x = p[0] + (q[0] - p[0]) * pulse.t;
        const y = p[1] + (q[1] - p[1]) * pulse.t;
        const depth = 1 - ((p[2] + q[2]) / 2 + 1) / 2;
        const tail = Math.max(0, pulse.t - 0.45);
        const trail = ctx.createLinearGradient(p[0] + (q[0] - p[0]) * tail, p[1] + (q[1] - p[1]) * tail, x, y);
        trail.addColorStop(0, `rgba(${pulse.color},0)`);
        trail.addColorStop(1, `rgba(${pulse.color},${(0.35 + depth * 0.55).toFixed(3)})`);
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath();
        ctx.moveTo(p[0] + (q[0] - p[0]) * tail, p[1] + (q[1] - p[1]) * tail);
        ctx.lineTo(x, y);
        ctx.stroke();
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 9 * dpr);
        glow.addColorStop(0, `rgba(${pulse.color},${(0.6 + depth * 0.4).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${pulse.color},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 9 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function loop(now) {
      draw(now);
      raf = running ? requestAnimationFrame(loop) : 0;
    }
    function play() {
      if (reduced || running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      running = false;
      cancelAnimationFrame(raf);
    }

    resize();
    if (reduced) draw(start + 4000);
    else play();

    const onResize = () => { resize(); if (reduced) draw(start + 4000); };
    const onMove = (event) => {
      const box = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - box.left) / box.width - 0.5;
      pointer.ty = (event.clientY - box.top) / box.height - 0.5;
      pointer.px = (event.clientX - box.left) * dpr;
      pointer.py = (event.clientY - box.top) * dpr;
    };
    // A click or tap fires signals out along every wire of the nearest node.
    const onDown = (event) => {
      if (reduced || !projectedNow.length || event.target.closest?.("a, button")) return;
      const box = canvas.getBoundingClientRect();
      const px = (event.clientX - box.left) * dpr, py = (event.clientY - box.top) * dpr;
      let best = 0, bestD = Infinity;
      projectedNow.forEach(([x, y, z], i) => {
        const d = (x - px) ** 2 + (y - py) ** 2 + (z > 0.2 ? 1e7 : 0);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (bestD > (220 * dpr) ** 2) return;
      for (const [i, k] of sphere.edges) {
        if (i !== best && k !== best) continue;
        pulses.push({ edge: i === best ? [i, k] : [k, i], t: 0, speed: 1.5 + Math.random(), color: SIGNALS[Math.floor(Math.random() * SIGNALS.length)], hops: 5 });
      }
    };
    const onLeave = () => { pointer.tx = 0; pointer.ty = 0; pointer.px = -9999; pointer.py = -9999; };
    const onVisibility = () => (document.hidden ? pause() : play());
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play(); else pause();
    });
    observer.observe(canvas);
    // Listen on the whole section: the canvas sits behind its content.
    const host = canvas.closest("section") || canvas.parentElement;
    window.addEventListener("resize", onResize);
    host?.addEventListener("pointermove", onMove);
    host?.addEventListener("pointerleave", onLeave);
    host?.addEventListener("pointerdown", onDown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      pause();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      host?.removeEventListener("pointermove", onMove);
      host?.removeEventListener("pointerleave", onLeave);
      host?.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [quiet]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
