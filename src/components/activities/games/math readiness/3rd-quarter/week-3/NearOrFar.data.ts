// Landmarks, objects, scene spots and spoken lines for Near or Far?; everything is emoji, so there are no image assets to ship.

export type Distance = "near" | "far";
export type Side = "left" | "right";

export function isDistance(value: unknown): value is Distance {
  return value === "near" || value === "far";
}

export function isSide(value: unknown): value is Side {
  return value === "left" || value === "right";
}

export const LANDMARKS: Record<string, { name: string; emoji: string }> = {
  tree: { name: "tree", emoji: "🌳" },
  house: { name: "house", emoji: "🏠" },
  school: { name: "school", emoji: "🏫" },
};

export const OBJECTS: Record<string, { name: string; emoji: string }> = {
  ball: { name: "ball", emoji: "⚽" },
  cat: { name: "cat", emoji: "🐱" },
  bike: { name: "bike", emoji: "🚲" },
  bird: { name: "bird", emoji: "🐦" },
  puppy: { name: "puppy", emoji: "🐶" },
};

export const isLandmark = (value: unknown): value is keyof typeof LANDMARKS => typeof value === "string" && value in LANDMARKS;
export const isObjectId = (value: unknown): value is keyof typeof OBJECTS => typeof value === "string" && value in OBJECTS;

/** Horizontal spots across the scene, in % from the landmark's side: the near copy sits close, the far copy at the other end. */
export const SPOT: Record<"landmark" | Distance, number> = { landmark: 11, near: 29, far: 88 };

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export function instruction(ask: Distance, objectId: string, landmark: string): string {
  return `Tap the ${OBJECTS[objectId].name} ${ask === "near" ? "near" : "far from"} the ${LANDMARKS[landmark].name}!`;
}

export function promptSpeech(ask: Distance, objectId: string, landmark: string): string {
  return `Look at the ${LANDMARKS[landmark].name} with the pin. Tap the ${OBJECTS[objectId].name} that is ${ask === "near" ? "near" : "far from"} the ${LANDMARKS[landmark].name}!`;
}

export function correctSpeech(ask: Distance, objectId: string, landmark: string): string {
  return `Yes! That ${OBJECTS[objectId].name} is ${ask === "near" ? "near" : "far from"} the ${LANDMARKS[landmark].name}!`;
}

export function revealSpeech(ask: Distance, objectId: string, landmark: string): string {
  return `Oops! This ${OBJECTS[objectId].name} is the one ${ask === "near" ? "near" : "far from"} the ${LANDMARKS[landmark].name}. Follow the path!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You found ${score} out of ${total} near and far things.`;
}
