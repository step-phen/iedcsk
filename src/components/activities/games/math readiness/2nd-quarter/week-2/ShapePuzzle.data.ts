// Shape palette and spoken lines for Shape Puzzle; shapes are drawn with CSS, no image assets to ship. The shared greeting and intro stay in lib/speech-lines.ts.

export type ShapeName = "circle" | "square" | "triangle" | "rectangle";

export const SHAPE_NAMES: Record<ShapeName, string> = {
  circle: "circle",
  square: "square",
  triangle: "triangle",
  rectangle: "rectangle",
};

export function isShapeName(value: unknown): value is ShapeName {
  return typeof value === "string" && value in SHAPE_NAMES;
}

export const INSTRUCTION = "Drag the piece into the outline where it fits!";

export function promptSpeech(shape: ShapeName): string {
  return `Find the outline shaped like a ${SHAPE_NAMES[shape]}, then drag the piece onto it!`;
}

export const TRY_AGAIN = "Not that outline. Try another one!";

export function correctSpeech(shape: ShapeName): string {
  return `Perfect fit! That outline is a ${SHAPE_NAMES[shape]}!`;
}

export function revealSpeech(shape: ShapeName): string {
  return `Here it is! This outline is the ${SHAPE_NAMES[shape]}!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You fit ${score} out of ${total} pieces.`;
}
