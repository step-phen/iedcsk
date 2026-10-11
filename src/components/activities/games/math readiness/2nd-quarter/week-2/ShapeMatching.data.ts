// Shape/color palette and spoken lines for Shape Matching; shapes are drawn with CSS, no image assets to ship. The shared greeting and intro stay in lib/speech-lines.ts.

export type ShapeName = "circle" | "square" | "triangle" | "rectangle";
export type SizeName = "small" | "medium" | "large";

export const SHAPE_NAMES: Record<ShapeName, string> = {
  circle: "circle",
  square: "square",
  triangle: "triangle",
  rectangle: "rectangle",
};

export function isShapeName(value: unknown): value is ShapeName {
  return typeof value === "string" && value in SHAPE_NAMES;
}

export const SIZE_PX: Record<SizeName, number> = {
  small: 58,
  medium: 82,
  large: 108,
};

function isSizeName(value: unknown): value is SizeName {
  return typeof value === "string" && value in SIZE_PX;
}

export const COLOR_HEX: Record<string, string> = {
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#FBBF24",
  purple: "#A855F7",
};

function isKnownColor(value: unknown): value is string {
  return typeof value === "string" && value in COLOR_HEX;
}

export interface Choice {
  id: string;
  shape: ShapeName;
  color: string;
  size: SizeName;
}

export function parseChoice(value: unknown): Choice {
  const c = value as { id?: unknown; shape?: unknown; color?: unknown; size?: unknown };
  if (typeof c.id !== "string" || !isShapeName(c.shape) || !isKnownColor(c.color) || !isSizeName(c.size)) {
    throw new Error("Choice needs a known shape, color and size");
  }
  return { id: c.id, shape: c.shape, color: c.color, size: c.size };
}

export function parseReference(value: unknown): { color: string; size: SizeName } {
  const r = value as { color?: unknown; size?: unknown };
  if (!isKnownColor(r.color) || !isSizeName(r.size)) throw new Error('"reference" needs a known color and size');
  return { color: r.color, size: r.size };
}

export const INSTRUCTION = "Tap the shape that matches!";

export function promptSpeech(shape: ShapeName): string {
  return `Find another ${SHAPE_NAMES[shape]}, no matter its color or size!`;
}

export const TRY_AGAIN = "Not quite. Look at the shape, not the color!";

export function correctSpeech(shape: ShapeName): string {
  return `Yes! That is a ${SHAPE_NAMES[shape]} too!`;
}

export function revealSpeech(shape: ShapeName): string {
  return `Here it is! This one is a ${SHAPE_NAMES[shape]} as well!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You matched ${score} out of ${total} shapes.`;
}
