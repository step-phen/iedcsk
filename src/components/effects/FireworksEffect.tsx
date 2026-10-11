"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

/**
 * Sustained fireworks, backed by canvas-confetti.
 *
 * Unlike the one-shot burst in RealisticEffect, this runs on an interval for a
 * set duration, launching from two columns near the left and right edges with
 * a particle count that tapers off as the run finishes. Intended for a results
 * or celebration screen the learner sits on, not for per-question feedback.
 *
 * Renders nothing itself — the library owns a single fixed, pointer-events-none
 * canvas, so the Finish button underneath stays clickable.
 */

/** Duplicated from RealisticEffect rather than shared, to keep that component's
 *  one-shot burst untouched. Same sampled palette, so both effects match. */
const CONFETTI_COLORS = [
  "#0c72fb", // blue
  "#24c009", // green
  "#f9730d", // orange
  "#fa2ca9", // pink
  "#f62b33", // red
  "#fbd016", // yellow
];

const SHAPES: confetti.Shape[] = ["star", "circle", "square"];

/** canvas-confetti's "Fireworks" preset. */
const TICK_MS = 250;
const BASE_PARTICLE_COUNT = 50;

/**
 * The preset sets `zIndex: 0` so the confetti sits behind page content. That is
 * not safe here: the game paints an opaque full-screen background image, so a
 * canvas at that level is at the mercy of DOM-order stacking and can end up
 * hidden entirely. Leaving the library default (100) keeps it reliably visible,
 * and the canvas is pointer-events-none either way.
 */
const FIREWORK_DEFAULTS: confetti.Options = {
  startVelocity: 30,
  spread: 360,
  ticks: 60,
  shapes: SHAPES,
  colors: CONFETTI_COLORS,
  disableForReducedMotion: true,
};

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export interface FireworksEffectProps {
  /** Rising edge starts the run; unmounting stops it. */
  active: boolean;
  /** How long to keep launching, in ms. */
  durationMs?: number;
  /** Called once the run finishes. */
  onComplete?: () => void;
}

export default function FireworksEffect({
  active,
  durationMs = 15000,
  onComplete,
}: FireworksEffectProps) {
  // Latest-callback ref: the interval below must always call the freshest
  // onComplete without the run restarting every time the parent re-renders
  // with a new function identity. Refreshed in an effect (not during render,
  // which React forbids) and declared before the run effect, so it is already
  // current by the time that one reads it.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    // No extra "rising edge" ref here on purpose — the [active, durationMs]
    // deps below already only re-run this effect when `active` flips, and a
    // persisted ref survived StrictMode's dev-only mount -> cleanup -> mount
    // cycle: the cleanup cleared the interval, but the ref still remembered
    // the prior run, so the second mount saw "already active" and skipped
    // restarting it — net result, no confetti ever fired.
    if (!active) return;

    // Bail out up front rather than spinning an interval that fires ~120 no-op
    // confetti() calls, each of which would be suppressed individually.
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onCompleteRef.current?.();
      return;
    }

    const animationEnd = Date.now() + durationMs;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        onCompleteRef.current?.();
        return;
      }

      // Taper off as the run winds down.
      const particleCount = BASE_PARTICLE_COUNT * (timeLeft / durationMs);

      // Particles fall, so start a little above the viewport.
      confetti({
        ...FIREWORK_DEFAULTS,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...FIREWORK_DEFAULTS,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [active, durationMs]);

  return null;
}
