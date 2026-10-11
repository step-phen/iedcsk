// Spoken lines and crayon palette for Shape Coloring; artwork is drawn procedurally (see drawShapePath in ShapeColoring.tsx), no image assets to ship.

export const ASSETS = {
  background: "/images/activities/number-coloring/number-coloring-bg.webp",
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

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

/** The whole crayon box; the DB names one of these per round ({"color": "blue"}). */
export const CRAYONS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: "yellow", hex: "#FBBF24" },
  { name: "red", hex: "#EF4444" },
  { name: "blue", hex: "#3B82F6" },
  { name: "pink", hex: "#EC4899" },
  { name: "purple", hex: "#A855F7" },
];

/** Shown under the title and spoken at the start of each round. */
export function roundPrompt(shape: ShapeName, color: string): string {
  return `This is a ${SHAPE_NAMES[shape]}. Color the ${SHAPE_NAMES[shape]} ${color}!`;
}

export function shortInstruction(shape: ShapeName, color: string): string {
  return `Color the ${SHAPE_NAMES[shape]} ${color}.`;
}

// Everything the game says after a pick or a finished shape; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  rightCrayon: ["Yes! That's {color}!", "Good choice! {color}!", "That's right, {color}!"],
  wrongCrayon: ["Oops! That is {picked}.", "Good try! That one is {picked}.", "Almost! That is {picked}."],
  done: ["Wonderful coloring!", "You did it!", "Beautiful work!", "Great job!", "Look at that color!"],
};

/** After the right crayon: names it, then says what to do with it. */
export function rightCrayonSpeech(line: string, color: string, shape: ShapeName): string {
  return `${line.replace("{color}", color)} Now color the ${SHAPE_NAMES[shape]}.`;
}

/** After a wrong crayon: names the one tapped, then points at the right one, which zooms in on screen. */
export function wrongCrayonSpeech(line: string, picked: string, color: string, shape: ShapeName): string {
  return `${line.replace("{picked}", picked)} Let's use ${color} for the ${SHAPE_NAMES[shape]}.`;
}

export function doneSpeech(line: string, shape: ShapeName): string {
  return `${line} That is a ${SHAPE_NAMES[shape]}.`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You picked the right color for ${score} out of ${total} shapes.`;
}
