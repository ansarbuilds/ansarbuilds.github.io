import { useEffect, useRef } from "react";

/* A ring that trails the pointer on the home page. It swells over links and
   buttons, and turns into a labelled disc over anything tagged data-cursor
   ("View" on projects). The real cursor stays, so nothing depends on it.
   Touch screens and reduced motion never mount it. */
export default function Cursor() {
  const ringRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!ring || !label) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let x = -100, y = -100, tx = -100, ty = -100, raf = 0, shown = false, last = 0;
    // Smoothing by elapsed time, not per frame, so the ring trails at the
    // same speed on a 60Hz and a 120Hz screen. FOLLOW is how quickly it
    // closes the gap: higher is tighter.
    const FOLLOW = 16;
    const tick = (now) => {
      const dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60;
      last = now;
      const k = 1 - Math.exp(-FOLLOW * dt);
      x += (tx - x) * k;
      y += (ty - y) * k;
      ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.2) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; }
    };
    const read = (target) => {
      const tagged = target?.closest?.("[data-cursor]");
      const link = !tagged && target?.closest?.("a, button, summary, [role='button']");
      ring.classList.toggle("is-label", !!tagged);
      ring.classList.toggle("is-link", !!link);
      if (tagged) label.textContent = tagged.dataset.cursor;
    };
    const onMove = (event) => {
      tx = event.clientX;
      ty = event.clientY;
      if (!shown) { shown = true; x = tx; y = ty; ring.classList.add("is-shown"); }
      read(event.target);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    // Scrolling moves the page under a still pointer, so look again.
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf || !shown) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; read(document.elementFromPoint(tx, ty)); });
    };
    const onLeave = () => { shown = false; ring.classList.remove("is-shown"); };
    const onDown = () => ring.classList.add("is-down");
    const onUp = () => ring.classList.remove("is-down");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <div ref={ringRef} className="sc-cursor" aria-hidden="true"><span><b ref={labelRef} /></span></div>;
}
