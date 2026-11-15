import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/** A number that counts from 0 up to `value` (or jumps there with reduced motion). */
export function TickNumber({ value, format = (n) => String(Math.round(n)), delay = 0 }: { value: number; format?: (n: number) => string; delay?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { setShown(value); return; }
    const c = animate(0, value, { duration: 0.9, delay, ease: "easeOut", onUpdate: setShown });
    return () => c.stop();
  }, [value, reduced, delay]);
  return <span className="num">{format(shown)}</span>;
}
