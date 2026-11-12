import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { SPRING, spring } from "../lib/motion";

/* A link that leans toward the pointer and gives a little when pressed. For
   the two primary calls to action only; if everything is magnetic, nothing
   is. The lean is a spring on motion values, so it follows the hand and
   settles without a CSS transition lagging behind it, and it is deliberately
   slight. Touch screens and reduced motion get a plain link. */
const PULL = { x: 0.14, y: 0.18 };
const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export default function MagneticLink({ children, ...props }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, SPRING.light), sy = useSpring(y, SPRING.light);
  if (reduced) return <a {...props}>{children}</a>;
  const lean = (event) => {
    if (!canHover()) return;
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (box.left + box.width / 2)) * PULL.x);
    y.set((event.clientY - (box.top + box.height / 2)) * PULL.y);
  };
  const rest = () => { x.set(0); y.set(0); };
  return <motion.a {...props} style={{ x: sx, y: sy }} whileTap={{ scale: 0.98 }} transition={spring("press")} onPointerMove={lean} onPointerLeave={rest}>{children}</motion.a>;
}
