// Toys and spoken lines for Find the Different One; the greeting and intro stay in lib/speech-lines.ts, and the flower is the Week 2 drawing.

import type { ObjectKey } from "../week-2/MissingPartsOfObjects.data";

const HUNT = "/images/activities/color-hunt";
const BIG_SMALL = "/images/activities/big-and-small/items";
const LONG_SHORT = "/images/activities/long-and-short/items";
const SIM = "/images/activities/similarities/asset";

/** How a toy is drawn: a picture (sized as a share of its cubby, maybe mirrored) or a Week 2 object drawing, maybe missing its part. */
export interface Toy {
  name: string;
  group: string;
  image?: string;
  drawing?: { object: ObjectKey; whole: boolean };
  size?: number;
  flip?: boolean;
  why?: string;
}

// Keyed by the seeder's ids; only the odd ones carry why they differ.
export const TOYS: Record<string, Toy> = {
  "balloon-red": { name: "red balloon", group: "balloons", image: `${HUNT}/balloon-red.webp` },
  "balloon-blue": { name: "blue balloon", group: "balloons", image: `${HUNT}/balloon-blue.webp`, why: "It has a different color!" },
  teddy: { name: "teddy bear", group: "teddy bears", image: `${BIG_SMALL}/teddy-bear.webp` },
  "teddy-small": { name: "small teddy bear", group: "teddy bears", image: `${BIG_SMALL}/teddy-bear.webp`, size: 0.5, why: "It is smaller!" },
  car: { name: "car", group: "cars", image: `${SIM}/car.webp` },
  "car-back": { name: "car", group: "cars", image: `${SIM}/car.webp`, flip: true, why: "It faces the other way!" },
  flower: { name: "flower", group: "flowers", drawing: { object: "flower", whole: true } },
  "flower-no-petal": { name: "flower", group: "flowers", drawing: { object: "flower", whole: false }, why: "It is missing a petal!" },
  pencil: { name: "long pencil", group: "pencils", image: `${LONG_SHORT}/long-pencil.webp` },
  // The short pencil image is drawn at 54% so its thickness matches the long one.
  "pencil-short": { name: "short pencil", group: "pencils", image: `${LONG_SHORT}/short-pencil.webp`, size: 0.54, why: "It is shorter!" },
};

export const isToy = (value: unknown): value is string => typeof value === "string" && value in TOYS;

export const INSTRUCTION = "Tap the one that is different!";

export const WRONG = "Oops, that one is the same as the others!";

export const DONE_TEXT = "Wow! You found every different toy!";

export function promptSpeech(answer: string): string {
  return `Look at the ${TOYS[answer].group}. Tap the one that is different!`;
}

export function rightSpeech(answer: string): string {
  return `That's correct! ${TOYS[answer].why ?? ""}`;
}

/** Said as the different toy lights up after a miss. */
export function revealSpeech(answer: string): string {
  return `This one is different. ${TOYS[answer].why ?? ""}`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
