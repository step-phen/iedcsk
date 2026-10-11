// Triangle sizes and spoken lines for Triangle Builders; the play itself is TraceCopyGame, the intro stays in lib/speech-lines.ts.

import type { Round, TraceCopyLines } from "./TraceCopyGame";

// Keyed by the seeder's ids: one triangle per round, each a new tent for the campsite.
export const SHAPES: Record<string, Omit<Round, "id">> = {
  "triangle-1": { kind: "triangle", w: 300, h: 260 },
  "triangle-2": { kind: "triangle", w: 250, h: 240 },
  "triangle-3": { kind: "triangle", w: 320, h: 220 },
  "triangle-4": { kind: "triangle", w: 220, h: 280 },
  "triangle-5": { kind: "triangle", w: 290, h: 290 },
};

// The tents' canvas colours, in turn.
export const TENT_COLORS = ["#ff7043", "#42a5f5", "#ffca28", "#66bb6a", "#ab47bc"];

export const LINES: TraceCopyLines = {
  instruction: { watch: "Watch the pencil draw!", trace: "Trace the triangle!", copy: "Draw your own triangle in the box!" },
  watch: () => "Watch me draw a triangle. Slant down, straight across, and slant back up!",
  trace: () => "Now you trace the triangle. Start at the green dot at the top and follow the arrow.",
  traced: "Great tracing!",
  copy: () => "Now draw your own triangle in the empty box!",
  right: () => "That's correct! You built a new tent!",
  copiedOnly: "Nice triangle! Let's keep building.",
  wrongTrace: "Oops! Watch the pencil draw the three sides again.",
  wrongCopy: () => "Oops! A triangle has three straight sides.",
  revealCopy: () => "A triangle has three sides and three corners, like this!",
  done: "You built a whole campsite!",
  result: (score, total) => `You built a whole campsite! You got ${score} out of ${total}.`,
};
