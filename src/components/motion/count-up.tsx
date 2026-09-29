"use client";

import { animate } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Counts up to `value` when it appears. Starts from 0 on both server and
 * client (no hydration mismatch) and jumps straight to the value when the
 * user prefers reduced motion.
 */
export function CountUp({
  value,
  format,
  duration = 0.9,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(0, value, {
      duration: reduce ? 0 : duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setN,
    });
    return () => controls.stop();
  }, [value, duration]);
  return (
    <span className="tabular">
      <span aria-hidden>{format(n)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
