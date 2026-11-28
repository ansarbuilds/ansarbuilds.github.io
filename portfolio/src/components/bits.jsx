import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

/* Small pieces the new pages share: scroll reveal, counting numbers, the
   tilting screenshot frame and links. */

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fades and lifts its children in the first time they come on screen.
// Anything already on screen when the page opens (a #link landing halfway
// down) shows at once.
export function Reveal({ as: Tag = "div", className = "", delay = 0, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !("IntersectionObserver" in window)) { setShown(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShown(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <Tag ref={ref} className={`ab-rv ${shown ? "is-in" : ""} ${className}`} style={{ "--d": `${delay}ms` }} {...rest}>{children}</Tag>;
}

// "896,133" counts up from zero the first time it is seen. Non-numeric
// parts ("v0.3.0", "~30k", "34/34") are kept and only the first number runs.
export function CountUp({ value, className = "" }) {
  const ref = useRef(null);
  const text = String(value);
  const match = text.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
  const [shown, setShown] = useState(() => (!match || reducedMotion() || Number(match[2].replace(/,/g, "")) === 0 ? text : null));
  useEffect(() => {
    const el = ref.current;
    if (!match || !el) return undefined;
    const target = Number(match[2].replace(/,/g, ""));
    const decimals = (match[2].split(".")[1] || "").length;
    const grouped = match[2].includes(",");
    const format = (n) => match[1] + (grouped ? Math.round(n).toLocaleString("en-US") : n.toFixed(decimals)) + match[3];
    if (reducedMotion() || target === 0 || !("IntersectionObserver" in window)) return undefined;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const ms = 1300;
      const step = (now) => {
        const p = Math.min(1, (now - start) / ms);
        const eased = 1 - Math.pow(1 - p, 4);
        setShown(p >= 1 ? text : format(target * eased));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  // The final value is always in the accessible name, never the counting one.
  return <span ref={ref} className={`ab-num ${className}`}><span className="sr-only">{text}</span><span aria-hidden="true">{shown ?? match?.[1] + "0" + match?.[3]}</span></span>;
}

// A screenshot in a frame that leans toward the pointer, with a light that
// follows it across the glass. Still on touch screens and for reduced motion.
export function Device({ src, alt, w, h, name, eager = false, className = "", children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || window.matchMedia("(hover: none)").matches) return undefined;
    let frame = 0;
    const onMove = (event) => {
      const box = el.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${(x - 0.5) * 9}deg`);
        el.style.setProperty("--rx", `${(0.5 - y) * 7}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
        el.classList.add("is-tilting");
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); cancelAnimationFrame(frame); };
  }, []);
  return (
    <div className={`ab-device-wrap ${className}`}>
      <div className="ab-device" ref={ref}>
        <div className="ab-device-bar" aria-hidden="true"><i /><i /><i /></div>
        <img src={src} alt={alt} width={w} height={h} loading={eager ? "eager" : "lazy"} decoding="async" style={name ? { viewTransitionName: name } : undefined} />
        <span className="ab-device-glare" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

const isExternal = (href) => /^https?:\/\//.test(href) || href.startsWith("mailto:");

export function Button({ href, children, primary = false, className = "" }) {
  const external = isExternal(href);
  return (
    <a href={href} className={`ab-btn ${primary ? "is-primary" : ""} ${className}`} {...(external && !href.startsWith("mailto:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <span>{children}</span>
      {external && <ArrowUpRight size={15} aria-hidden="true" />}
      {external && !href.startsWith("mailto:") && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

export function Stats({ items, className = "" }) {
  return (
    <dl className={`ab-stats ${className}`}>
      {items.map(([value, label]) => (
        <div key={label}>
          <dt className="sr-only">{label}</dt>
          <dd className="ab-stat-value"><CountUp value={value} /></dd>
          <dd className="ab-stat-label" aria-hidden="true">{label}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Chips({ items }) {
  return <ul className="ab-chips" aria-label="Built with">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}
