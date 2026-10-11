// Farm animals, drop spots and spoken lines for Place It Here; the pen and barn are drawn in PlaceItHere.tsx.

export type Spot = "inside" | "outside" | "near" | "far";
export type Side = "left" | "right";

export const SPOTS: Spot[] = ["inside", "outside", "near", "far"];

export function isSpot(value: unknown): value is Spot {
  return typeof value === "string" && (SPOTS as string[]).includes(value);
}

export const ANIMALS: Record<string, { name: string; image: string }> = {
  hen: { name: "hen", image: "/images/activities/place-it-here/hen.webp" },
  pig: { name: "pig", image: "/images/activities/place-it-here/pig.webp" },
  sheep: { name: "sheep", image: "/images/activities/place-it-here/sheep.webp" },
  cow: { name: "cow", image: "/images/activities/place-it-here/cow.webp" },
  duck: { name: "duck", image: "/images/activities/place-it-here/duck.webp" },
};

export function isAnimal(value: unknown): value is keyof typeof ANIMALS {
  return typeof value === "string" && value in ANIMALS;
}

/** Inside/outside rounds use the pen, near/far rounds use the barn. */
export function placeOf(spot: Spot): "pen" | "barn" {
  return spot === "inside" || spot === "outside" ? "pen" : "barn";
}

/** The two spots offered in a round. */
export function pairOf(spot: Spot): [Spot, Spot] {
  return placeOf(spot) === "pen" ? ["inside", "outside"] : ["near", "far"];
}

/** Spot centres in % of the field when the pen or barn stands on the left; mirrored for the right. */
const SPOT_XY: Record<Spot, { x: number; y: number }> = {
  inside: { x: 26, y: 66 },
  outside: { x: 78, y: 66 },
  near: { x: 37, y: 74 },
  far: { x: 86, y: 74 },
};

export function spotXY(spot: Spot, side: Side): { x: number; y: number } {
  const { x, y } = SPOT_XY[spot];
  return { x: side === "left" ? x : 100 - x, y };
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

const phrase = (spot: Spot) => (spot === "far" ? "far from" : spot);

export function instruction(animal: string, spot: Spot): string {
  return `Put the ${ANIMALS[animal].name} ${phrase(spot)} the ${placeOf(spot)}!`;
}

export function promptSpeech(animal: string, spot: Spot): string {
  return `Put the ${ANIMALS[animal].name} ${phrase(spot)} the ${placeOf(spot)}. Drag it there.`;
}

export function correctSpeech(animal: string, spot: Spot): string {
  return `Good job! The ${ANIMALS[animal].name} is ${phrase(spot)} the ${placeOf(spot)}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(animal: string, spot: Spot): string {
  return `This is the correct answer! The ${ANIMALS[animal].name} goes ${phrase(spot)} the ${placeOf(spot)}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You placed ${score} out of ${total} farm animals in the right spot.`;
}
