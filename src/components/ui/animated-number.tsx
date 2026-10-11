"use client";

import { useEffect, useState } from "react";

/**
 * Counts up from 0 to `value` on mount using an eased requestAnimationFrame
 * loop. `tabular-nums` keeps digit width fixed so the surrounding layout
 * doesn't jitter while the count runs. Skips straight to the final value
 * under prefers-reduced-motion.
 */
export default function AnimatedNumber({
  value,
  duration = 600,
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced || value <= 0) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setDisplay(value);
      return;
    }

    let raf: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className ? `tabular-nums ${className}` : "tabular-nums"}>
      {display}
      {suffix}
    </span>
  );
}
