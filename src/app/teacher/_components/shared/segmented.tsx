"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** A row of buttons for a short either/or choice like the quarter, so switching is one tap instead of a dropdown. */
export default function Segmented({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
}: {
  label: string;
  hideLabel?: boolean;
  options: { value: string; label: string; ariaLabel?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className={cn("text-xs font-bold text-gray-700", hideLabel && "sr-only")}>
        {label}
      </span>
      <div role="group" aria-labelledby={labelId} className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5 shadow-xs">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative h-7 cursor-pointer whitespace-nowrap rounded-md px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sidebar/30",
              // Pressed feedback lands on pointer-down, before the click commits.
              "transition-[color,transform] duration-100 ease-out active:scale-[0.96] motion-reduce:active:scale-100",
              o.value === value ? "text-white" : "text-gray-700 hover:bg-stone-100",
            )}
          >
            {/* One pill per group glides to the picked option: a critically damped spring, no overshoot. */}
            {o.value === value && (
              <motion.span
                layoutId={`${labelId}-pill`}
                aria-hidden="true"
                className="absolute inset-0 rounded-md bg-sidebar"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.3 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
