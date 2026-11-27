import { useEffect, useRef, useState } from "react";

/* ============================================================
   TELEMETRY INSTRUMENT CANVAS — Original Hero Visual
   A precision oscilloscope / phase-space / empirical eval curve
   instrument inspired by Swiss drafting & hardware telemetry.
   Three interactive modes (PHASE, WAVE, EVAL) with smooth
   pointer coupling, live crosshair readout, and zero 0/1 clichés.
   Respects prefers-reduced-motion and pauses when off-screen.
   ============================================================ */

const MODES = [
  { id: "phase", label: "PHASE", caption: "HARMONIC PHASE ORBIT" },
  { id: "wave", label: "WAVE", caption: "DUAL-CHANNEL SIGNAL TRACE" },
  { id: "eval", label: "EVAL", caption: "EMPIRICAL CALIBRATION CURVE" },
];

export default function TelemetryFieldCanvas({ className = "" }) {
  const canvasRef = useRef(null);
  const [modeIdx, setModeIdx] = useState(0);
  const modeRef = useRef(0);
  const [readout, setReadout] = useState({ a: "0.94", b: "0.12" });

  useEffect(() => {
    modeRef.current = modeIdx;
  }, [modeIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 420;
    let height = 320;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let inView = true;
    let pageVisible = !document.hidden;
    let t = 0;
    let lastReadout = 0;

    const pointer = { nx: 0.5, ny: 0.5, active: false, tx: 0.5, ty: 0.5 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(240, Math.round(rect.width || 420));
      height = Math.max(200, Math.round(rect.height || 320));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(t);
    }

    function drawGrid() {
      ctx.fillStyle = "#111318";
      ctx.fillRect(0, 0, width, height);

      // Subtle architectural coordinate grid
      const step = 28;
      ctx.strokeStyle = "rgba(244, 243, 239, 0.065)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = step; x < width; x += step) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      // Center axes
      const cx = width * 0.5;
      const cy = height * 0.5;
      ctx.strokeStyle = "rgba(244, 243, 239, 0.14)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, cy + 0.5);
      ctx.lineTo(width, cy + 0.5);
      ctx.moveTo(cx + 0.5, 0);
      ctx.lineTo(cx + 0.5, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Corner registration crosshairs
      ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
      const m = 16;
      const s = 5;
      for (const [rx, ry] of [[m, m], [width - m, m], [m, height - m], [width - m, height - m]]) {
        ctx.beginPath();
        ctx.moveTo(rx - s, ry);
        ctx.lineTo(rx + s, ry);
        ctx.moveTo(rx, ry - s);
        ctx.lineTo(rx, ry + s);
        ctx.stroke();
      }
    }

    function drawPhase(time) {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const rx = width * 0.36;
      const ry = height * 0.36;
      const freqX = 3;
      const freqY = 2;
      const delta = time * 0.55 + (pointer.nx - 0.5) * 2.2;
      const warp = 1 + (pointer.ny - 0.5) * 0.35;

      // Secondary ghost harmonic in amber
      ctx.strokeStyle = "rgba(245, 158, 11, 0.38)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      const steps = 260;
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * Math.PI * 2;
        const x = cx + Math.sin(freqX * u + delta * 0.7) * rx * 0.88;
        const y = cy + Math.sin(freqY * u + 0.6) * ry * 0.88 * warp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Primary phase orbit in cobalt
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * Math.PI * 2;
        const x = cx + Math.sin(freqX * u + delta) * rx;
        const y = cy + Math.sin(freqY * u) * ry * warp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Tracking beacon along the curve
      const headU = (time * 1.15) % (Math.PI * 2);
      const hx = cx + Math.sin(freqX * headU + delta) * rx;
      const hy = cy + Math.sin(freqY * headU) * ry * warp;

      ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.moveTo(0, hy);
      ctx.lineTo(width, hy);
      ctx.stroke();

      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f4f3ef";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawWave(time) {
      const cy = height * 0.5;
      const amp = height * 0.28 * (0.75 + pointer.ny * 0.5);
      const freq = 0.02 + pointer.nx * 0.015;

      // Envelope band
      ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const env = Math.sin((x / width) * Math.PI);
        const y = cy - Math.sin(x * freq + time * 2.1) * amp * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let x = width; x >= 0; x -= 4) {
        const env = Math.sin((x / width) * Math.PI);
        const y = cy + Math.cos(x * freq * 1.4 - time * 1.5) * amp * 0.65 * env;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Primary cobalt waveform
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const env = Math.sin((x / width) * Math.PI);
        const y = cy - (Math.sin(x * freq + time * 2.1) * 0.7 + Math.sin(x * freq * 2.3 - time * 1.3) * 0.3) * amp * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary amber reference wave + sample ticks
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const env = Math.sin((x / width) * Math.PI);
        const y = cy + Math.cos(x * freq * 1.4 - time * 1.5) * amp * 0.55 * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Vertical sample stems
      ctx.strokeStyle = "rgba(244, 243, 239, 0.25)";
      ctx.lineWidth = 1;
      for (let x = 28; x < width - 20; x += 28) {
        const env = Math.sin((x / width) * Math.PI);
        const y = cy - (Math.sin(x * freq + time * 2.1) * 0.7 + Math.sin(x * freq * 2.3 - time * 1.3) * 0.3) * amp * env;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = "#f4f3ef";
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }

    function drawEval(time) {
      const padL = 34;
      const padR = 24;
      const padT = 30;
      const padB = 34;
      const w = width - padL - padR;
      const h = height - padT - padB;

      // Ideal calibration diagonal
      ctx.strokeStyle = "rgba(244, 243, 239, 0.22)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padL, padT + h);
      ctx.lineTo(padL + w, padT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Empirical measured curve (cobalt) vs baseline (amber)
      const drift = Math.sin(time * 0.9) * 0.04 + (pointer.ny - 0.5) * 0.14;
      const pts = 14;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const coords = [];
      for (let i = 0; i <= pts; i++) {
        const u = i / pts;
        const val = Math.min(0.98, Math.max(0.04, Math.pow(u, 0.72) + Math.sin(u * Math.PI * 3 + time * 0.7) * 0.035 + drift * Math.sin(u * Math.PI)));
        const x = padL + u * w;
        const y = padT + h * (1 - val);
        coords.push([x, y]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Null / unclipped comparison curve in amber
      ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const u = i / pts;
        const val = Math.min(0.92, Math.max(0.04, Math.pow(u, 1.18) - Math.cos(u * Math.PI * 2 + time * 0.5) * 0.025));
        const x = padL + u * w;
        const y = padT + h * (1 - val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Measured data points with error bars
      for (let i = 1; i < coords.length - 1; i++) {
        const [x, y] = coords[i];
        const err = 8 + (i % 3) * 4;
        ctx.strokeStyle = "rgba(244, 243, 239, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - err);
        ctx.lineTo(x, y + err);
        ctx.stroke();
        ctx.fillStyle = i === Math.round(pointer.nx * (pts - 1)) ? "#f59e0b" : "#f4f3ef";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function draw(time) {
      drawGrid();
      const m = modeRef.current;
      if (m === 0) drawPhase(time);
      else if (m === 1) drawWave(time);
      else drawEval(time);
    }

    resize();

    if (reduced) {
      draw(1.2);
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      return () => ro.disconnect();
    }

    let last = performance.now();
    const tick = (now) => {
      raf = 0;
      if (!inView || !pageVisible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // Ease pointer
      pointer.nx += (pointer.tx - pointer.nx) * 0.08;
      pointer.ny += (pointer.ty - pointer.ny) * 0.08;

      draw(t);

      if (now - lastReadout > 180) {
        lastReadout = now;
        const a = (0.86 + Math.sin(t * 0.9 + pointer.nx) * 0.11).toFixed(2);
        const b = (0.04 + Math.abs(Math.cos(t * 0.7 + pointer.ny)) * 0.14).toFixed(2);
        setReadout({ a, b });
      }

      raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!raf && inView && pageVisible) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
      pointer.ty = Math.min(1, Math.max(0, (e.clientY - rect.top) / Math.max(1, rect.height)));
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.tx = 0.5;
      pointer.ty = 0.5;
      pointer.active = false;
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

    kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  const current = MODES[modeIdx];

  return (
    <div className={`at-inst ${className}`}>
      <div className="at-inst-head">
        <span className="at-inst-id">
          <i aria-hidden="true" />
          INST. 01 · {current.caption}
        </span>
        <div className="at-inst-modes" role="group" aria-label="Instrument display mode">
          {MODES.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={i === modeIdx}
              className={i === modeIdx ? "is-on" : ""}
              onClick={() => setModeIdx(i)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="at-inst-canvas"
        aria-hidden="true"
        onClick={() => setModeIdx((n) => (n + 1) % MODES.length)}
      />
      <div className="at-inst-foot" aria-hidden="true">
        <span>SIGNAL <b>{readout.a}</b></span>
        <span>DRIFT <b>±{readout.b}</b></span>
        <span>MOVE OR CLICK</span>
      </div>
    </div>
  );
}
