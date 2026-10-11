/**
 * The app's shared weak/average/strong colour encoding for a 0-100 value.
 *
 * Lives here rather than inside animated-progress-bar.tsx because that file is
 * "use client" — a server component importing from it gets a client reference
 * proxy that throws when called during render.
 */

/** Fill colour for a bar. Color encodes state so the bar says more than "some progress". */
export function colorForPercent(percent: number) {
  if (percent < 40) return "bg-red-500";
  if (percent < 70) return "bg-amber-500";
  return "bg-emerald-500";
}

/**
 * The 70 boundary is shared with learner-strength-service.ts's STRENGTH_FLOOR /
 * WEAKNESS_CEILING, so a band chip can never contradict the colour of its own bar.
 */
export const GOOD_PERCENT_THRESHOLD = 70;
