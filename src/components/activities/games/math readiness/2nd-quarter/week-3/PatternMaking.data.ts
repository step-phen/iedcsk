// Pattern data and spoken lines for Pattern Making; reuses the shape glyph palette from Continue the Pattern
// (same week, same 4 shapes) so the two games draw shapes identically but ask for a different skill.

import { SHAPE_COLOR, SHAPE_NAMES, isShapeName, type ShapeName } from "./ContinueThePattern.data";

export { SHAPE_COLOR, SHAPE_NAMES, isShapeName };
export type { ShapeName };

// Same score stars as Number/Shape Coloring, so every game rewards with the same star.
export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

/** An AB pattern repeated twice, as a fixed reference — the learner then builds every blank after it. */
export function referenceOf(shapes: readonly [ShapeName, ShapeName]): ShapeName[] {
  const [a, b] = shapes;
  return [a, b, a, b];
}

/** The shape that belongs in blank `i` (0-based) right after the 4-tile reference. */
export function expectedAt(shapes: readonly [ShapeName, ShapeName], i: number): ShapeName {
  return shapes[i % 2];
}

export const INSTRUCTION = "Build what comes next! Tap the shapes in order.";

export const PROMPT = "Look at the pattern, then tap the shapes to build what comes next!";

export function correctSpeech(shape: ShapeName): string {
  return `Yes, a ${SHAPE_NAMES[shape]}!`;
}

export function revealSpeech(shape: ShapeName): string {
  return `Oops, not that one. The right shape is the ${SHAPE_NAMES[shape]}!`;
}

export const PATTERN_DONE = "You built the whole pattern!";

export const PATTERN_DONE_MISSED = "Good try! Look at the finished pattern.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You got ${score} out of ${total} shapes right.`;
}
