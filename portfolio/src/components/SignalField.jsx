import { useEffect, useRef } from "react";

/* The hero backdrop: an agent graph in depth. Layers of nodes stand one
   behind another, like a network seen at an angle, wired forward from the
   input layer to the output. Signals enter on the left and run through to
   the far side, and every node flares as a signal reaches it. The graph
   sways slowly and leans toward the pointer. It is the one ambient thing in
   its viewport, so it stays calm until it is touched: a click sends a burst
   out of the nearest node (with a short label if `labels` are given) and
   moves the whole graph on to its next shape, and it settles back by
   itself a few seconds later.

   `gatherTo` (a CSS selector inside the same section) turns it into a
   closing shot: the first time it scrolls in, signals travel inward to
   that element over 1.4s and then the wires go quiet. A single still frame
   is drawn for reduced motion, and the loop stops while the section is off
   screen or the tab is hidden. */

const INK = [239, 230, 216];
const SIGNALS = [[255, 138, 95], [255, 196, 120], [120, 220, 255]];
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/* Builds the graph. `sizes` is how many nodes each layer holds; layers run
   along x from -1 to 1, and each layer's nodes are spread over a disc
   facing down that axis (wider in the middle, so the whole thing is a
   spindle). Every node is wired to its nearest few in the next layer, and
   edges always point forward: [from, to]. */
function buildGraph(sizes) {
  const nodes = [];
  // One ring per layer, drawn as a faint gate the signals pass through.
  const rings = [];
  const layers = sizes.map((count, layer) => {
    const x = sizes.length === 1 ? 0 : -1.3 + (2.6 * layer) / (sizes.length - 1);
    const radius = 0.34 + 0.5 * Math.sin((Math.PI * (layer + 0.5)) / sizes.length);
    rings.push([x, radius * 1.12]);
    const ids = [];
    for (let i = 0; i < count; i += 1) {
      // A sunflower spread fills the disc evenly; a little jitter keeps it
      // from reading as a lattice.
      const r = radius * Math.sqrt((i + 0.6) / count);
      const a = GOLDEN * i + layer * 0.9;
      ids.push(nodes.length);
      nodes.push([x + (Math.random() - 0.5) * 0.06, Math.cos(a) * r + (Math.random() - 0.5) * 0.05, Math.sin(a) * r + (Math.random() - 0.5) * 0.05, Math.random() * Math.PI * 2]);
    }
    return ids;
  });
  const edges = [];
  for (let layer = 0; layer < layers.length - 1; layer += 1) {
    const linked = new Set();
    const wire = (from, to) => { edges.push([from, to]); linked.add(to); };
    const near = (id, pool) => pool
      .map((other) => [other, (nodes[id][1] - nodes[other][1]) ** 2 + (nodes[id][2] - nodes[other][2]) ** 2])
      .sort((p, q) => p[1] - q[1]);
    for (const from of layers[layer]) near(from, layers[layer + 1]).slice(0, 2).forEach(([to]) => wire(from, to));
    // No node is left without a way in.
    for (const to of layers[layer + 1]) if (!linked.has(to)) wire(near(to, layers[layer])[0][0], to);
  }
  // The same nodes, re-seated: the graph takes each of these shapes in turn.
  const total = nodes.length;
  const forms = [
    nodes.map(([x, y, z]) => [x, y, z]),
    // A double helix along the same axis.
    nodes.map((_, i) => {
      const k = i / (total - 1), a = k * Math.PI * 5 + (i % 2) * Math.PI;
      return [-1.3 + 2.6 * k, Math.cos(a) * 0.52, Math.sin(a) * 0.52];
    }),
    // A globe.
    nodes.map((_, i) => {
      const y = 1 - (i / (total - 1)) * 2, r = Math.sqrt(1 - y * y), a = GOLDEN * i;
      return [Math.cos(a) * r * 0.95, y * 0.95, Math.sin(a) * r * 0.95];
    }),
    // A trefoil knot.
    nodes.map((_, i) => {
      const u = (i / total) * Math.PI * 2, r = 0.62 + 0.3 * Math.cos(3 * u);
      return [r * Math.cos(2 * u) * 1.25, r * Math.sin(2 * u) * 1.05, 0.42 * Math.sin(3 * u)];
    }),
  ];
  return { nodes, forms, edges, rings, inputs: edges.filter(([from]) => layers[0].includes(from)) };
}
// A click changes the shape. This is how long the change takes, how long the
// new shape stays before the graph settles back, and the arrival on load.
const MORPH_S = 1.2;
const REST_S = 9;
const WARP_S = 0.9;
const smooth = (k) => k * k * k * (k * (k * 6 - 15) + 10);

const WIDE_LAYERS = [4, 7, 11, 14, 11, 7, 4];
const NARROW_LAYERS = [3, 6, 9, 6, 3];

const GATHER_MS = 1400;
const LABEL_MS = 1200;

export default function SignalField({ className = "", quiet = false, labels = null, gatherTo = null }) {
  // Kept in a ref so a new array each render does not restart the canvas.
  const labelsRef = useRef(labels);
  useEffect(() => { labelsRef.current = labels; }, [labels]);

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
    let projectedNow = [];
    // How brightly each node is lit by an arriving signal, fading out.
    let flare = [];
    // A click shoves nearby nodes outward; they spring back. Screen pixels.
    let shove = [];
    let spin = 0, lastT = 0, nowT = 0;
    // Which shape the graph is leaving and heading for, and since when.
    const shape = { from: 0, to: 0, since: 0 };
    // Burst labels: { node, text, born }.
    const tags = [];
    let nextLabel = 0;
    // The closing gather: motes that fly to a point, then nothing more.
    let gather = null;
    let gathered = false;
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
        sphere = buildGraph(narrow ? NARROW_LAYERS : WIDE_LAYERS);
        // Signals in flight point at the old node set, so drop them.
        pulses.length = 0;
        tags.length = 0;
        projectedNow = [];
        flare = new Array(sphere.nodes.length).fill(0);
        shove = sphere.nodes.map(() => [0, 0, 0, 0]);
      }
    }

    function draw(now) {
      // The first frame can be stamped a hair before `start`.
      const t = Math.max(0, (now - start) / 1000);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      // A slow sway instead of a spin: the graph keeps facing the same way,
      // so the signals always read as running left to right.
      const dt = Math.min(0.05, Math.max(0, t - lastT));
      lastT = t;
      nowT = t;

      // Which shape, and how far into the change to the next one. The quiet
      // copy behind Contact, and reduced motion, stay on the first shape.
      // The graph rests in its layered shape. A click sends it to the next
      // shape, and if it is left alone it comes home. Nothing changes shape
      // by itself, so the hero has one calm thing moving, not a show.
      if (shape.to !== 0 && shape.from === shape.to && t - shape.since > REST_S) { shape.from = shape.to; shape.to = 0; shape.since = t; }
      const morph = shape.from === shape.to ? 1 : smooth(Math.min(1, (t - shape.since) / MORPH_S));
      if (morph >= 1 && shape.from !== shape.to) { shape.from = shape.to; shape.since = t; }
      const from = sphere.forms[shape.from], to = sphere.forms[shape.to];
      // How much of the layered graph is showing (its rings fade with it).
      const layered = (shape.from === 0 ? 1 - morph : 0) + (shape.to === 0 ? morph : 0);
      // Mid-change the nodes fly apart before they find their new seats.
      const scatter = Math.sin(morph * Math.PI) * 0.35;
      // The other shapes turn on the spot; the layered graph only sways, and
      // eases back to face front when it returns.
      if (layered < 0.5) spin += dt * 0.18;
      else spin += (Math.round(spin / (Math.PI * 2)) * Math.PI * 2 - spin) * Math.min(1, dt * 3);
      // Warp in: everything arrives from far out in the first second.
      const warp = reduced ? 1 : smooth(Math.min(1, t / WARP_S));

      const ry = 0.32 + Math.sin(t * 0.21) * 0.1 + pointer.x * 0.5 + spin;
      const rx = -0.2 + Math.sin(t * 0.16) * 0.07 + pointer.y * 0.4;
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      const R = Math.min(w * (narrow ? 0.3 : 0.17), h * 0.33) * (1 + (1 - warp) * 2.6);
      const ox = narrow ? w * 0.5 : w * 0.71;
      const oy = narrow ? h * 0.36 : h * 0.48;
      const focal = 2.6;

      const project = (x, y, z) => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y1 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const s = focal / (focal + z2);
        return [ox + x1 * R * s, oy + y1 * R * s, z2, s];
      };
      // Each node bobs a little on its own beat.
      const projected = sphere.nodes.map(([, , , phase], n) => {
        const a = from[n], b = to[n];
        const burst = 1 + scatter * (0.6 + Math.sin(phase * 3) * 0.6);
        const point = project(
          (a[0] + (b[0] - a[0]) * morph) * burst,
          (a[1] + (b[1] - a[1]) * morph) * burst + Math.sin(t * 0.7 + phase) * 0.025,
          (a[2] + (b[2] - a[2]) * morph) * burst + Math.cos(phase * 5) * scatter * 0.5,
        );
        // Spring the click shove back to rest.
        const push = shove[n];
        push[2] += (-push[0] * 60 - push[2] * 9) * dt;
        push[3] += (-push[1] * 60 - push[3] * 9) * dt;
        push[0] += push[2] * dt;
        push[1] += push[3] * dt;
        point[0] += push[0];
        point[1] += push[1];
        return point;
      });
      ctx.globalAlpha = warp;

      projectedNow = projected;
      ctx.clearRect(0, 0, w, h);

      // A warm core, breathing slowly.
      const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 1.25);
      core.addColorStop(0, `rgba(255,120,70,${(0.16 + Math.sin(t * 0.8) * 0.04).toFixed(3)})`);
      core.addColorStop(0.55, "rgba(255,120,70,0.05)");
      core.addColorStop(1, "rgba(255,120,70,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      // Layer gates: a ring around each layer, the middle ones brightest.
      ctx.lineWidth = dpr;
      sphere.rings.forEach(([x, radius], layer) => {
        const mid = 1 - Math.abs(layer - (sphere.rings.length - 1) / 2) / sphere.rings.length;
        ctx.strokeStyle = `rgba(${INK},${((0.05 + mid * 0.11) * layered).toFixed(3)})`;
        ctx.beginPath();
        for (let step = 0; step <= 56; step += 1) {
          const a = (step / 56) * Math.PI * 2;
          const [px, py] = project(x, Math.cos(a) * radius, Math.sin(a) * radius);
          if (step) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.stroke();
      });

      // Wires: brighter toward the front.
      ctx.lineWidth = Math.max(1, 0.9 * dpr);
      for (const [i, k] of sphere.edges) {
        const p = projected[i], q = projected[k];
        const depth = 1 - ((p[2] + q[2]) / 2 + 1) / 2;
        ctx.strokeStyle = `rgba(${INK},${(0.04 + depth * 0.2).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      }

      // Nodes, lit up near the pointer or by a signal that just arrived.
      for (let n = 0; n < projected.length; n += 1) {
        const [x, y, z, s] = projected[n];
        const depth = 1 - (z + 1) / 2;
        flare[n] *= 0.93;
        const near = Math.max(flare[n] > 0.03 ? flare[n] : 0, 1 - Math.hypot(x - pointer.px, y - pointer.py) / (140 * dpr));
        ctx.fillStyle = near > 0.05 ? `rgba(255,138,95,${(0.45 + near * 0.55).toFixed(3)})` : `rgba(${INK},${(0.25 + depth * 0.75).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, (1.5 + depth * 2.4 + near * 3) * s * dpr, 0, Math.PI * 2);
        ctx.fill();
        // A node that is lit, by the pointer or a signal, carries a soft halo.
        const halo = near;
        if (halo > 0.05) {
          const size = (10 + halo * 16) * s * dpr;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, size);
          glow.addColorStop(0, `rgba(255,150,105,${(halo * 0.32).toFixed(3)})`);
          glow.addColorStop(1, "rgba(255,150,105,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Signals: spawn on random wires, travel end to end, fade out.
      if (!reduced && !gathered && now - lastSpawn > (narrow ? 420 : 300) && pulses.length < (quiet ? 6 : narrow ? 8 : 12)) {
        lastSpawn = now;
        pulses.push({ edge: sphere.inputs[Math.floor(Math.random() * sphere.inputs.length)], t: 0, speed: 0.9 + Math.random() * 0.9, color: SIGNALS[Math.floor(Math.random() * SIGNALS.length)], hops: 12 });
      }
      ctx.globalCompositeOperation = "lighter";
      for (let n = pulses.length - 1; n >= 0; n -= 1) {
        const pulse = pulses[n];
        pulse.t += pulse.speed / 60;
        if (pulse.t >= 1) {
          // Hop on to a wire that starts where this one ended.
          pulse.hops -= 1;
          const end = pulse.edge[1];
          flare[end] = 1;
          // Forward only: the wires that leave the node it just reached.
          const next = sphere.edges.filter(([from]) => from === end);
          if (pulse.hops <= 0 || !next.length) { pulses.splice(n, 1); continue; }
          pulse.edge = next[Math.floor(Math.random() * next.length)];
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

      // Burst labels: a name beside the node that was clicked, fading out.
      for (let n = tags.length - 1; n >= 0; n -= 1) {
        const tag = tags[n];
        const age = (now - tag.born) / LABEL_MS;
        const at = projected[tag.node];
        if (age >= 1 || !at) { tags.splice(n, 1); continue; }
        const alpha = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
        ctx.font = `600 ${11 * dpr}px "JetBrains Mono", monospace`;
        ctx.textBaseline = "middle";
        const width = ctx.measureText(tag.text).width;
        const tx = at[0] + 16 * dpr, ty = at[1] - (14 + age * 10) * dpr;
        ctx.fillStyle = `rgba(12,10,9,${(alpha * 0.78).toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect(tx - 8 * dpr, ty - 11 * dpr, width + 16 * dpr, 22 * dpr, 11 * dpr);
        ctx.fill();
        ctx.fillStyle = `rgba(255,138,95,${alpha.toFixed(3)})`;
        ctx.fillText(tag.text.toUpperCase(), tx, ty);
      }

      // The gather: motes ease in to one point, brightest as they land.
      if (gather) {
        const k = Math.min(1, (now - gather.born) / GATHER_MS);
        const eased = 1 - (1 - k) ** 3;
        ctx.globalCompositeOperation = "lighter";
        for (const mote of gather.motes) {
          const mk = Math.min(1, Math.max(0, (eased - mote.lag) / (1 - mote.lag)));
          const x = mote.x + (gather.x - mote.x) * mk, y = mote.y + (gather.y - mote.y) * mk;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 8 * dpr);
          glow.addColorStop(0, `rgba(${mote.color},${(0.25 + mk * 0.7).toFixed(3)})`);
          glow.addColorStop(1, `rgba(${mote.color},0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, 8 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        // A soft light stays where they landed.
        const rest = ctx.createRadialGradient(gather.x, gather.y, 0, gather.x, gather.y, 220 * dpr);
        rest.addColorStop(0, `rgba(255,138,95,${(eased * 0.1).toFixed(3)})`);
        rest.addColorStop(1, "rgba(255,138,95,0)");
        ctx.fillStyle = rest;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
        if (k >= 1) gather.motes.length = 0;
      }
    }

    // Start the gather once, aimed at the middle of the target element.
    function startGather() {
      if (!gatherTo || gathered) return;
      const target = canvas.closest("section")?.querySelector(gatherTo);
      if (!target) return;
      gathered = true;
      pulses.length = 0;
      const box = canvas.getBoundingClientRect(), to = target.getBoundingClientRect();
      const gx = (to.left + to.width / 2 - box.left) * dpr, gy = (to.top + to.height / 2 - box.top) * dpr;
      const motes = reduced ? [] : Array.from({ length: 34 }, () => {
        const angle = Math.random() * Math.PI * 2, far = Math.max(w, h) * (0.35 + Math.random() * 0.35);
        return { x: gx + Math.cos(angle) * far, y: gy + Math.sin(angle) * far * 0.6, lag: Math.random() * 0.35, color: SIGNALS[Math.floor(Math.random() * SIGNALS.length)] };
      });
      gather = { x: gx, y: gy, born: reduced ? -GATHER_MS : performance.now(), motes };
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
        pulses.push({ edge: i === best ? [i, k] : [k, i], t: 0, speed: 1.5 + Math.random(), color: SIGNALS[Math.floor(Math.random() * SIGNALS.length)], hops: 12 });
      }
      flare[best] = 1;
      // Each click moves the graph on to its next shape.
      if (!quiet && shape.from === shape.to) { shape.to = (shape.from + 1) % sphere.forms.length; shape.since = nowT; }
      // Shockwave: everything near the click is thrown outward.
      projectedNow.forEach(([x, y], n) => {
        const dx = x - px, dy = y - py, far = Math.hypot(dx, dy) || 1;
        const force = Math.max(0, 1 - far / (420 * dpr)) * 620 * dpr;
        shove[n][2] += (dx / far) * force;
        shove[n][3] += (dy / far) * force;
        flare[n] = Math.max(flare[n], force / (620 * dpr));
      });
      const names = labelsRef.current;
      if (names?.length) {
        tags.push({ node: best, text: names[nextLabel % names.length], born: performance.now() });
        nextLabel += 1;
      }
    };
    const onLeave = () => { pointer.tx = 0; pointer.ty = 0; pointer.px = -9999; pointer.py = -9999; };
    const onVisibility = () => (document.hidden ? pause() : play());
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && entry.intersectionRatio >= 0.35) {
        startGather();
        if (reduced) draw(start + 4000);
      }
      if (visible) play(); else pause();
    }, { threshold: [0, 0.35] });
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
  }, [quiet, gatherTo]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
