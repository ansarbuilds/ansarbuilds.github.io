import { useEffect, useRef } from "react";
import { FRAGMENT, VERTEX } from "../lib/fieldShader";
import { boost } from "../lib/fieldBoost";

/* The light field behind every page (see lib/fieldShader.js).

   It draws at half resolution (the field is soft, so it upscales cleanly)
   and only while the tab is visible. Reduced motion gets one still frame
   that is redrawn on a theme change. If WebGL2 is missing the canvas stays
   empty and the CSS gradient on .ab-field shows instead. */


const SCALE = 0.5;
const isDark = () => document.documentElement.dataset.theme === "dark";

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader failed");
  return shader;
}

export default function Field() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { antialias: false, alpha: false, depth: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl || gl.isContextLost()) return undefined;
    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link failed");
    } catch (error) {
      if (import.meta.env.DEV) console.warn("field:", error);
      return undefined;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(["uRes", "uTime", "uMouse", "uScroll", "uDark", "uEnergy"].map((name) => [name, gl.getUniformLocation(program, name)]));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const state = {
      w: 0, h: 0,
      mouse: [0, 0], mouseTarget: [0, 0],
      dark: isDark() ? 1 : 0,
      energy: 1,
      start: performance.now(),
      frame: 0,
      running: false,
    };

    const resize = () => {
      const w = Math.max(1, Math.round(window.innerWidth * SCALE));
      const h = Math.max(1, Math.round(window.innerHeight * SCALE));
      if (w === state.w && h === state.h) return;
      state.w = w; state.h = h;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (!state.mouse[0]) state.mouse = state.mouseTarget = [w * 0.72, h * 0.62];
    };

    const draw = (now) => {
      const scroll = window.scrollY / Math.max(1, window.innerHeight);
      // Strongest at the top of the page, calmer once reading starts.
      const energyTarget = boost.value * (1 - 0.42 * Math.min(1, scroll / 1.2));
      const darkTarget = isDark() ? 1 : 0;
      const still = reduced.matches;
      const k = still ? 1 : 0.06;
      state.energy += (energyTarget - state.energy) * k;
      state.dark += (darkTarget - state.dark) * (still ? 1 : 0.08);
      state.mouse = state.mouse.map((v, i) => v + (state.mouseTarget[i] - v) * (still ? 1 : 0.05));
      gl.uniform2f(u.uRes, state.w, state.h);
      gl.uniform1f(u.uTime, still ? 24 : (now - state.start) / 1000 + 24);
      gl.uniform2f(u.uMouse, state.mouse[0], state.mouse[1]);
      gl.uniform1f(u.uScroll, scroll);
      gl.uniform1f(u.uDark, state.dark);
      gl.uniform1f(u.uEnergy, state.energy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now) => {
      if (!state.running) return;
      draw(now);
      state.frame = requestAnimationFrame(loop);
    };
    const play = () => {
      if (state.running || document.hidden) return;
      if (reduced.matches) { draw(performance.now()); return; }
      state.running = true;
      state.frame = requestAnimationFrame(loop);
    };
    const pause = () => { state.running = false; cancelAnimationFrame(state.frame); };

    const onPointer = (event) => {
      if (event.pointerType === "touch") return;
      state.mouseTarget = [event.clientX * SCALE, (window.innerHeight - event.clientY) * SCALE];
    };
    const onVisibility = () => (document.hidden ? pause() : play());
    const onResize = () => { resize(); if (!state.running) draw(performance.now()); };
    // A theme switch or reduced-motion change while paused still redraws.
    const themeWatch = new MutationObserver(() => { if (!state.running) draw(performance.now()); });
    const onMotion = () => { pause(); play(); };
    const onScroll = () => { if (!state.running) draw(performance.now()); };

    // If the GPU drops the context, the CSS gradient underneath shows instead.
    const onLost = (event) => { event.preventDefault(); pause(); canvas.classList.remove("is-live"); };
    canvas.addEventListener("webglcontextlost", onLost);

    resize();
    play();
    canvas.classList.add("is-live");
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    reduced.addEventListener("change", onMotion);
    return () => {
      pause();
      themeWatch.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      // The context is left alive on purpose: React may mount this again on
      // the same canvas (StrictMode), and a lost context cannot be reused.
    };
  }, []);

  return <div className="ab-field" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
