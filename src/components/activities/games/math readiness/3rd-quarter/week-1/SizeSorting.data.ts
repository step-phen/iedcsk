// Objects, step sizes and spoken lines for Size Sorting; objects are emoji drawn at three sizes, so there are no image assets to ship.

export type Size = "small" | "medium" | "big";

/** Left to right up the stairs: the lowest step holds the smallest object. */
export const SIZES: Size[] = ["small", "medium", "big"];

export const OBJECTS: Record<string, { name: string; plural: string; emoji: string }> = {
  teddy: { name: "teddy bear", plural: "teddy bears", emoji: "🧸" },
  ball: { name: "ball", plural: "balls", emoji: "⚽" },
  fish: { name: "fish", plural: "fish", emoji: "🐟" },
  tree: { name: "tree", plural: "trees", emoji: "🌳" },
  car: { name: "car", plural: "cars", emoji: "🚗" },
};

export function isObjectId(value: unknown): value is keyof typeof OBJECTS {
  return typeof value === "string" && value in OBJECTS;
}

export const OBJECT_FONT: Record<Size, string> = {
  small: "clamp(30px, 6vh, 50px)",
  medium: "clamp(50px, 10vh, 82px)",
  big: "clamp(74px, 15vh, 124px)",
};

export const STEP_HEIGHT: Record<Size, string> = {
  small: "clamp(36px, 7vh, 60px)",
  medium: "clamp(64px, 13vh, 110px)",
  big: "clamp(92px, 19vh, 160px)",
};

const STEP_NAME: Record<Size, string> = { small: "lowest step", medium: "middle step", big: "highest step" };
const SIZE_WORD: Record<Size, string> = { small: "smallest", medium: "middle", big: "biggest" };

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Smallest on the low step, biggest on the high step!";

export function promptSpeech(objectId: string): string {
  return `Put the ${OBJECTS[objectId].plural} on the stairs. The smallest goes on the lowest step, and the biggest goes on the highest step!`;
}

export const CORRECT: Record<Size, string> = { small: "Small!", medium: "Bigger!", big: "Biggest!" };

export function revealSpeech(size: Size, objectId: string): string {
  return `Oops! The ${SIZE_WORD[size]} ${OBJECTS[objectId].name} goes on the ${STEP_NAME[size]}.`;
}

export const DONE = "Small, bigger, biggest! You did it!";

export const DONE_MISSED = "Good try! Look: small, bigger, biggest.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You lined up ${score} out of ${total} sets from small to big.`;
}
