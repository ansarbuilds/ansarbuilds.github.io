import { useEffect, useRef } from "react";

/* A printed-texture backdrop: a soft, slow noise field reduced to two
   tones with a 4x4 ordered (Bayer) dither, drawn as small square pixels in
   ink on stone. It is static, drawn once per size, so it costs nothing
   while you scroll. `seed` varies the pattern between bands. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

function field(x, y, seed) {
  // A few overlapping waves make a terrain-like field without a noise library.
  return (
    Math.sin(x * 0.021 + seed) * 0.5 +
    Math.sin(y * 0.034 - seed * 1.7) * 0.35 +
    Math.sin((x + y) * 0.013 + seed * 0.6) * 0.45 +
    Math.sin(Math.hypot(x - 300 * Math.cos(seed), y - 90) * 0.028) * 0.4
  );
}

export default function DitherField({ seed = 1, pixel = 4, density = 0.5, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgb(17 19 24 / .32)";
      const cols = Math.ceil(w / pixel), rows = Math.ceil(h / pixel);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          // Map the field to 0..1, bias it by density, then threshold by the Bayer cell.
          // Stretch the contrast so the band has dense ridges and open clearings.
          const v = (field(i * pixel, j * pixel, seed) + 1.7) / 3.4;
          const tone = Math.min(1, Math.max(0, (v - 0.5) * 2.4 + density));
          if (tone > BAYER[(j % 4) * 4 + (i % 4)]) ctx.fillRect(i * pixel, j * pixel, pixel - 1, pixel - 1);
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [seed, pixel, density]);

  return <canvas ref={ref} className={`qp-dither ${className}`} aria-hidden="true" />;
}
