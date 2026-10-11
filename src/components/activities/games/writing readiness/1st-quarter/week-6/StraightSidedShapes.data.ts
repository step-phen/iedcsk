// Square and rectangle sizes and spoken lines for Straight-Sided Shapes; the play itself is TraceCopyGame, the intro stays in lib/speech-lines.ts.

import type { Round, TraceCopyLines } from "./TraceCopyGame";

// Keyed by the seeder's ids: squares and rectangles in turn, each a new building for the town.
export const SHAPES: Record<string, Omit<Round, "id">> = {
  "square-1": { kind: "square", w: 250, h: 250 },
  "rectangle-1": { kind: "rectangle", w: 320, h: 180 },
  "square-2": { kind: "square", w: 210, h: 210 },
  "rectangle-2": { kind: "rectangle", w: 180, h: 310 },
  "square-3": { kind: "square", w: 270, h: 270 },
};

// The buildings' wall colours, in turn.
export const BUILDING_COLORS = ["#ff8a65", "#4dd0e1", "#ffd54f", "#ba68c8", "#81c784"];

const sides = (r: Round) => (r.kind === "square" ? "four sides that are all the same" : "two long sides and two short sides");

export const LINES: TraceCopyLines = {
  instruction: { watch: "Watch the pencil draw!", trace: "Trace the shape!", copy: "Draw your own shape in the box!" },
  watch: (r) => `Watch me draw a ${r.kind}. Across, down, back, and up!`,
  trace: (r) => `Now you trace the ${r.kind}. Start at the green dot and follow the arrow.`,
  traced: "Great tracing!",
  copy: (r) => `Now draw your own ${r.kind} in the empty box!`,
  right: (r) => `That's correct! A new ${r.kind} building for the town!`,
  copiedOnly: "Nice drawing! Let's keep building.",
  wrongTrace: "Oops! Watch the pencil draw the straight sides again.",
  wrongCopy: (r) => `Oops! A ${r.kind} has four straight sides.`,
  revealCopy: (r) => `A ${r.kind} has ${sides(r)}, like this!`,
  done: "You built a whole town!",
  result: (score, total) => `You built a whole town! You got ${score} out of ${total}.`,
};
