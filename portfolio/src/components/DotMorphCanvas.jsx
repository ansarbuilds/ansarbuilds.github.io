import { useEffect, useRef } from "react";

/* ============================================================
   DOT MORPH CANVAS — 2D coral dot-matrix hero visual.
   Morphs smoothly between circle -> flower -> cube every ~2.8s,
   springing to target positions. Pointer movement repels nearby
   dots and temporarily flips disturbed dots into 0/1 mono glyphs.
   Respects prefers-reduced-motion and pauses when off-screen.
   ============================================================ */

const COUNT = 260;
const MORPH_MS = 2800;
const SHAPES = ["circle", "flower", "cube"];

function buildCircle(n, cx, cy, r) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const rad = Math.sqrt(t) * r;
    const theta = i * golden;
    pts.push({ x: cx + Math.cos(theta) * rad, y: cy + Math.sin(theta) * rad });
  }
  return pts;
}

function buildFlower(n, cx, cy, r) {
  const pts = [];
  const petals = 6;
  const rings = 9;
  for (let i = 0; i < n; i++) {
    const ring = (i % rings) / (rings - 1);
    const angle = (i / n) * Math.PI * 2 * rings + ring * 0.4;
    const petalWave = 0.62 + 0.38 * Math.cos(petals * angle);
    const rad = r * (0.16 + 0.88 * ring) * petalWave;
    pts.push({ x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad });
  }
  return pts;
}

function buildCube(n, cx, cy, r) {
  // Isometric 3-face cube lattice projected to 2D
  const pts = [];
  const perFace = Math.floor(n / 3);
  const side = Math.ceil(Math.sqrt(perFace));
  const s = r * 0.78;
  const ax = { x: Math.cos(Math.PI / 6) * s, y: Math.sin(Math.PI / 6) * s };
  const ay = { x: -Math.cos(Math.PI / 6) * s, y: Math.sin(Math.PI / 6) * s };
  const az = { x: 0, y: -s };

  const pushFace = (origin, uVec, vVec, count) => {
    for (let k = 0; k < count; k++) {
      const gx = (k % side) / Math.max(1, side - 1);
      const gy = Math.floor(k / side) / Math.max(1, Math.ceil(count / side) - 1);
      pts.push({
        x: cx + origin.x + uVec.x * gx + vVec.x * gy,
        y: cy + origin.y + uVec.y * gx + vVec.y * gy,
      });
    }
  };

  // Top face
  pushFace({ x: 0, y: -s }, ax, ay, perFace);
  // Left face
  pushFace({ x: 0, y: 0 }, ay, az, perFace);
  // Right face
  pushFace({ x: 0, y: 0 }, ax, az, n - perFace * 2);

  return pts;
}

export default function DotMorphCanvas({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 360;
    let height = 360;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let shapeIdx = 0;
    let targets = [];
    let raf = 0;
    let inView = true;
    let pageVisible = !document.hidden;
    let lastSwitch = performance.now();

    const pointer = { x: -9999, y: -9999, active: false };

    const dots = Array.from({ length: COUNT }, (_, i) => ({
      x: 180,
      y: 180,
      vx: 0,
      vy: 0,
      r: i % 9 === 0 ? 3.2 : i % 3 === 0 ? 2.5 : 1.9,
      glyph: i % 2 === 0 ? "0" : "1",
      disturbed: 0,
      tone: i % 11 === 0 ? "#000000" : i % 4 === 0 ? "#d35f68" : "#e57981",
    }));

    function computeTargets(idx) {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const rad = Math.min(width, height) * 0.39;
      const kind = SHAPES[idx % SHAPES.length];
      if (kind === "circle") return buildCircle(COUNT, cx, cy, rad);
      if (kind === "flower") return buildFlower(COUNT, cx, cy, rad);
      return buildCube(COUNT, cx, cy, rad);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(220, Math.round(rect.width || 360));
      height = Math.max(220, Math.round(rect.height || 360));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      targets = computeTargets(shapeIdx);
      if (reduced) drawStatic();
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);
      ctx.font = '600 10px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < COUNT; i++) {
        const d = dots[i];
        if (d.disturbed > 0.28) {
          ctx.fillStyle = d.disturbed > 0.6 ? "#000000" : "#a8323c";
          ctx.fillText(d.glyph, d.x, d.y);
        } else {
          ctx.fillStyle = d.tone;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawStatic() {
      for (let i = 0; i < COUNT; i++) {
        dots[i].x = targets[i].x;
        dots[i].y = targets[i].y;
        dots[i].disturbed = 0;
      }
      drawFrame();
    }

    resize();
    for (let i = 0; i < COUNT; i++) {
      dots[i].x = targets[i].x;
      dots[i].y = targets[i].y;
    }

    if (reduced) {
      drawStatic();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    const step = (now) => {
      raf = 0;
      if (!inView || !pageVisible) return;

      if (now - lastSwitch >= MORPH_MS) {
        lastSwitch = now;
        shapeIdx = (shapeIdx + 1) % SHAPES.length;
        targets = computeTargets(shapeIdx);
      }

      const stiffness = 0.085;
      const damping = 0.78;
      const repelRadius = 74;

      for (let i = 0; i < COUNT; i++) {
        const d = dots[i];
        const t = targets[i];

        // Spring toward morph target
        d.vx += (t.x - d.x) * stiffness;
        d.vy += (t.y - d.y) * stiffness;

        // Pointer repulsion
        if (pointer.active) {
          const dx = d.x - pointer.x;
          const dy = d.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < repelRadius && dist > 0.01) {
            const force = (1 - dist / repelRadius) * 6.5;
            d.vx += (dx / dist) * force;
            d.vy += (dy / dist) * force;
            d.disturbed = Math.min(1, d.disturbed + 0.35);
          }
        }

        d.vx *= damping;
        d.vy *= damping;
        d.x += d.vx;
        d.y += d.vy;

        const speed = Math.hypot(d.vx, d.vy);
        if (speed > 2.2) {
          d.disturbed = Math.min(1, d.disturbed + 0.14);
        } else {
          d.disturbed = Math.max(0, d.disturbed - 0.045);
        }
      }

      drawFrame();
      raf = requestAnimationFrame(step);
    };

    const kick = () => {
      if (!raf && inView && pageVisible) raf = requestAnimationFrame(step);
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onClick = () => {
      lastSwitch = performance.now();
      shapeIdx = (shapeIdx + 1) % SHAPES.length;
      targets = computeTargets(shapeIdx);
      for (let i = 0; i < COUNT; i++) {
        dots[i].disturbed = 0.85;
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) kick();
    }, { threshold: 0.05 });
    io.observe(canvas);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    canvas.addEventListener("click", onClick);

    kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
}
