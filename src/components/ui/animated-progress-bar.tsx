"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { colorForPercent } from "@/lib/progress-color";

/**
 * A progress bar that fills from 0 on mount instead of painting straight at
 * its final width. Double rAF so the browser commits the 0% frame before the
 * transition to `percent` starts — a single rAF can still land in the same
 * paint as the initial render and skip the transition entirely.
 */
export default function AnimatedProgressBar({
  percent,
  label,
}: {
  percent: number;
  /** Accessible name announced with the value, e.g. the quarter this bar tracks. */
  label?: string;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setWidth(percent);
      return;
    }

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWidth(percent));
    });
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-4 w-full rounded-full bg-gray-200 overflow-hidden ring-1 ring-inset ring-black/5"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
          colorForPercent(percent),
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
