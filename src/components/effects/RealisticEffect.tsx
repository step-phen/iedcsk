"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

/**
 * Confetti burst, backed by canvas-confetti.
 *
 * Renders nothing itself — the library owns a single fixed, pointer-events-none
 * canvas at z-index 100, which already sits above the game chrome.
 *
 * Motion is canvas-confetti's "Realistic Look" preset: five overlapping bursts
 * fired at once with different spreads, velocities, decays and scales. The
 * layering is what stops it reading as one flat expanding ring.
 */

/** Sampled from the original confetti art (gloss/white pixels excluded) so the
 *  built-in shapes stay visually continuous with the rest of the game. */
const CONFETTI_COLORS = [
  "#0c72fb", // blue
  "#24c009", // green
  "#f9730d", // orange
  "#fa2ca9", // pink
  "#f62b33", // red
  "#fbd016", // yellow
];

const SHAPES: confetti.Shape[] = ["star", "circle", "square"];

/**
 * Particle lifetime in frames; ~1.17s at 60fps.
 *
 * The upstream preset leaves this at the library default of 200 (~3.3s). That
 * does not work here: callers advance the question 1400ms after a correct
 * answer, and confetti outliving that bleeds onto the next question. The
 * preset's character comes from the layered spread/velocity/decay values
 * below, not from how long particles linger, so shortening this is safe.
 */
const TICKS = 70;
const TOTAL_MS = (TICKS / 60) * 1000;

/** canvas-confetti's "Realistic Look" preset, verbatim apart from `ticks`. */
const FIRE_STEPS: { ratio: number; opts: confetti.Options }[] = [
  { ratio: 0.25, opts: { spread: 26, startVelocity: 55 } },
  { ratio: 0.2, opts: { spread: 60 } },
  { ratio: 0.35, opts: { spread: 100, decay: 0.91, scalar: 0.8 } },
  { ratio: 0.1, opts: { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 } },
  { ratio: 0.1, opts: { spread: 120, startVelocity: 45 } },
];

export interface RealisticEffectProps {
  /** Rising edge fires a burst; holding it true does not re-fire. */
  active: boolean;
  /** Burst origin as viewport percentages. Defaults to dead centre. */
  originX?: number;
  originY?: number;
  /** Total particles across all five bursts. */
  pieceCount?: number;
  /** Called once the burst has finished. */
  onComplete?: () => void;
}

export default function RealisticEffect({
  active,
  originX = 50,
  originY = 50,
  pieceCount = 200,
  onComplete,
}: RealisticEffectProps) {
  const wasActive = useRef(false);
  // Latest-callback ref: the burst below must always call the freshest
  // onComplete without restarting every time the parent re-renders with a new
  // function identity. Refreshed in an effect (not during render, which React
  // forbids) and declared before the run effect, so it is already current by
  // the time that one reads it.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    const rising = active && !wasActive.current;
    wasActive.current = active;
    if (!rising) return;

    const shared: confetti.Options = {
      ticks: TICKS,
      shapes: SHAPES,
      colors: CONFETTI_COLORS,
      // The preset hardcodes { y: 0.7 }; we anchor to the caller's point
      // instead so the burst comes off whatever the learner tapped.
      origin: { x: originX / 100, y: originY / 100 },
      // The library honours the OS setting for us — a full-screen particle
      // burst is exactly the motion reduced-motion users opt out of.
      disableForReducedMotion: true,
    };

    for (const { ratio, opts } of FIRE_STEPS) {
      confetti({
        ...shared,
        ...opts,
        particleCount: Math.floor(pieceCount * ratio),
      });
    }

    const done = setTimeout(() => onCompleteRef.current?.(), TOTAL_MS);
    return () => clearTimeout(done);
  }, [active, originX, originY, pieceCount]);

  return null;
}
