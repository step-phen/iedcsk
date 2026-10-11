// Circle sizes and spoken lines for Round and Round; the play itself is TraceCopyGame, the intro stays in lib/speech-lines.ts.

import type { Round, TraceCopyLines } from "./TraceCopyGame";

// Keyed by the seeder's ids: one circle per round, each a new segment for the caterpillar.
export const SHAPES: Record<string, Omit<Round, "id">> = {
  "circle-1": { kind: "circle", w: 300, h: 300 },
  "circle-2": { kind: "circle", w: 250, h: 250 },
  "circle-3": { kind: "circle", w: 290, h: 290 },
  "circle-4": { kind: "circle", w: 220, h: 220 },
  "circle-5": { kind: "circle", w: 270, h: 270 },
};

// The caterpillar's segment colours, in turn.
export const SEGMENT_COLORS = ["#7ed957", "#ffd23f", "#4cc36b", "#ff9f40", "#3fae72"];

export const LINES: TraceCopyLines = {
  instruction: { watch: "Watch the pencil draw!", trace: "Trace the circle!", copy: "Draw your own circle in the box!" },
  watch: () => "Watch me draw a circle. Round and round, back to the start!",
  trace: () => "Now you trace the circle. Start at the green dot and follow the arrow.",
  traced: "Great tracing!",
  copy: () => "Now draw your own circle in the empty box!",
  right: () => "That's correct! Your caterpillar grew a new circle!",
  copiedOnly: "Nice circle! Let's keep going.",
  wrongTrace: "Oops! Watch the pencil go round again.",
  wrongCopy: () => "Oops! That doesn't look like a circle yet.",
  revealCopy: () => "A circle goes round and round, back to the start, like this!",
  done: "Your caterpillar is all grown!",
  result: (score, total) => `Your caterpillar is all grown! You got ${score} out of ${total}.`,
};
