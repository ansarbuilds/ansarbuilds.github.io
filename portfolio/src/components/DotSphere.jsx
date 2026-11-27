import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/* A lit ball drawn on a square dot-matrix grid. Each cell of the grid
   inside the disc samples a slowly turning sphere: the facing side gets
   large cobalt dots, the far edge small faint ones, and a band of
   "latitude" lines rolls across so the turn is readable. Pointer movement
   tips the light a little. Reduced motion draws one still frame. */
const COBALT = [29, 78, 216];
const INK = [17, 19, 24];

export default function DotSphere({ cells = 25, className = "" }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let visible = true;
    const light = { x: -0.45, y: -0.55, tx: -0.45, ty: -0.55 };

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t) => {
      const w = canvas.clientWidth;
      ctx.clearRect(0, 0, w, w);
      const step = w / cells;
      const r = (cells - 1) / 2;
      const spin = t * 0.00018;
      light.x += (light.tx - light.x) * 0.05;
      light.y += (light.ty - light.y) * 0.05;
      const lz = Math.sqrt(Math.max(0, 1 - light.x * light.x - light.y * light.y));
      for (let j = 0; j < cells; j++) {
        for (let i = 0; i < cells; i++) {
          const x = (i - r) / r, y = (j - r) / r;
          const d2 = x * x + y * y;
          if (d2 > 1) continue;
          const z = Math.sqrt(1 - d2);
          // Lambert shading from a light up and to the left.
          const lit = Math.max(0, x * light.x + y * light.y + z * lz);
          // Latitude bands on the turning sphere, so the motion shows.
          const lon = Math.atan2(x, z) + spin;
          const band = 0.5 + 0.5 * Math.cos(lon * 6);
          const v = Math.min(1, 0.18 + lit * 0.72 + band * 0.22 * z);
          const dot = step * (0.16 + 0.34 * v);
          const color = v > 0.42 ? COBALT : INK;
          const alpha = v > 0.42 ? 0.35 + 0.65 * v : 0.12 + 0.2 * v;
          ctx.fillStyle = `rgb(${color.join(" ")} / ${alpha.toFixed(3)})`;
          const cx = (i + 0.5) * step, cy = (j + 0.5) * step;
          ctx.fillRect(cx - dot / 2, cy - dot / 2, dot, dot);
        }
      }
    };

    const loop = (t) => {
      if (visible) draw(t);
      raf = requestAnimationFrame(loop);
    };

    size();
    const onResize = () => { size(); draw(performance.now()); };
    const onMove = (event) => {
      const box = canvas.getBoundingClientRect();
      const nx = ((event.clientX - box.left) / box.width) * 2 - 1;
      const ny = ((event.clientY - box.top) / box.height) * 2 - 1;
      light.tx = Math.max(-0.7, Math.min(0.7, nx * 0.6));
      light.ty = Math.max(-0.7, Math.min(0.7, ny * 0.6));
    };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(canvas);
    window.addEventListener("resize", onResize);

    if (reduced) {
      draw(0);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [cells, reduced]);

  return <canvas ref={ref} className={`qp-sphere ${className}`} aria-hidden="true" />;
}
