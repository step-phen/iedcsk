"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Blank space between the end of one copy and the start of the next. */
const GAP_PX = 48;

/**
 * Scrolls text that is too wide for its container, continuously, while hovered.
 *
 * Built for the lesson picker, where names like "Similarities, Differences &
 * Things That Don't Belong - 1st Quarter" are cut off mid-word by the
 * dropdown's fixed width — the teacher can see there is more text but not
 * what it says.
 *
 * Only scrolls when the text actually overflows: the width is measured on
 * hover, so short names sit perfectly still. A CSS-only marquee cannot make
 * that distinction and would jiggle every item in the list.
 *
 * While scrolling, a second copy of the text trails the first. The animation
 * travels exactly one copy plus the gap, so at the moment it wraps, the
 * duplicate has arrived where the original started and the seam is invisible.
 * The copy is aria-hidden — screen readers get the text once.
 */
export default function MarqueeText({
  children,
  className,
  /** Pixels travelled per second. */
  speed = 45,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  const start = useCallback(() => {
    const outer = outerRef.current;
    const text = textRef.current;
    if (!outer || !text) return;
    // 1px of slack: sub-pixel text widths otherwise report a phantom overflow
    // and set stationary text crawling.
    if (text.scrollWidth > outer.clientWidth + 1) {
      setDistance(text.scrollWidth + GAP_PX);
    }
  }, []);

  const stop = useCallback(() => setDistance(0), []);

  const scrolling = distance > 0;

  return (
    <span
      ref={outerRef}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
      className={cn("block w-full min-w-0 overflow-hidden", className)}
    >
      <span
        data-marquee-track={scrolling ? "" : undefined}
        className={scrolling ? "flex w-max" : "block"}
        style={
          scrolling
            ? {
                ["--marquee-distance" as string]: `${distance}px`,
                animation: `marquee-loop ${distance / speed}s linear infinite`,
              }
            : undefined
        }
      >
        {/* inline-block, not inline: an inline element has no scroll box, so
            scrollWidth would not report the text's real width and the
            overflow check below would never fire. */}
        <span ref={textRef} className="inline-block whitespace-nowrap">
          {children}
        </span>
        {scrolling && (
          <span
            aria-hidden="true"
            className="inline-block whitespace-nowrap"
            style={{ paddingLeft: GAP_PX }}
          >
            {children}
          </span>
        )}
      </span>
    </span>
  );
}
