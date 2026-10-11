// Shape palette and spoken lines for Pattern Detective; shapes are drawn with CSS, no image assets to ship. The shared greeting and intro stay in lib/speech-lines.ts.

export type ShapeName = "circle" | "square" | "triangle" | "rectangle";

export const SHAPE_NAMES: Record<ShapeName, string> = {
  circle: "circle",
  square: "square",
  triangle: "triangle",
  rectangle: "rectangle",
};

export const SHAPE_COLOR: Record<ShapeName, string> = {
  circle: "#EF4444",
  square: "#3B82F6",
  triangle: "#FBBF24",
  rectangle: "#22C55E",
};

export function isShapeName(value: unknown): value is ShapeName {
  return typeof value === "string" && value in SHAPE_NAMES;
}

export const INSTRUCTION = "Which piece is missing from the pattern?";

export const PROMPT = "Be a pattern detective! Find the piece that is missing from the pattern.";

export const TRY_AGAIN = "Not quite. Look at the pattern again!";

export function correctSpeech(shape: ShapeName): string {
  return `Yes! A ${SHAPE_NAMES[shape]} is missing there!`;
}

export function revealSpeech(shape: ShapeName): string {
  return `The missing piece is a ${SHAPE_NAMES[shape]}!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You solved ${score} out of ${total} patterns.`;
}
