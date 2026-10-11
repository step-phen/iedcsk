// Circus things and spoken lines for the Q3 Math Readiness Review; the scarf, rope, ring and tent are drawn in MathReadinessReview3.tsx.

export type Size = "big" | "small";
export type Length = "long" | "short";
export type Distance = "near" | "far";
export type Position = "inside" | "outside";
export type Direction = "smallToBig" | "bigToSmall";

export const THINGS: Record<string, { name: string; emoji: string }> = {
  balloon: { name: "balloon", emoji: "🎈" },
  elephant: { name: "elephant", emoji: "🐘" },
  drum: { name: "drum", emoji: "🥁" },
  hat: { name: "hat", emoji: "🎩" },
  seal: { name: "seal", emoji: "🦭" },
  monkey: { name: "monkey", emoji: "🐒" },
  dog: { name: "dog", emoji: "🐶" },
  horse: { name: "horse", emoji: "🐴" },
};

export function isThing(value: unknown): value is keyof typeof THINGS {
  return typeof value === "string" && value in THINGS;
}

export const LONG_THINGS = {
  scarf: { name: "magic scarf" },
  rope: { name: "rope" },
} as const;

export type LongThing = keyof typeof LONG_THINGS;

export function isLongThing(value: unknown): value is LongThing {
  return typeof value === "string" && value in LONG_THINGS;
}

export type Round =
  | { key: string; kind: "size"; object: keyof typeof THINGS; ask: Size }
  | { key: string; kind: "length"; object: LongThing; ask: Length }
  | { key: string; kind: "order"; object: keyof typeof THINGS; direction: Direction; orderedFirst: boolean }
  | { key: string; kind: "distance"; object: keyof typeof THINGS; ask: Distance; side: "left" | "right" }
  | { key: string; kind: "position"; object: keyof typeof THINGS; ask: Position };

/** The choice id that answers the round, which is also what gets submitted. */
export const answerOf = (round: Round) => (round.kind === "order" ? "ordered" : round.ask);

export const nameOf = (round: Round) => (round.kind === "length" ? LONG_THINGS[round.object].name : THINGS[round.object].name);

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
  bgLandscape: "/images/activities/math-readiness-review-3/bg-landscape.webp",
  bgPortrait: "/images/activities/math-readiness-review-3/bg-portrait.webp",
  clown: "/images/activities/math-readiness-review-3/clown.webp",
};

export function thingImagePath(thing: keyof typeof THINGS): string {
  return `/images/activities/math-readiness-review-3/items/${thing}.webp`;
}

const directionWords = (direction: Direction) => (direction === "smallToBig" ? "small to big" : "big to small");

/** What the right answer is, e.g. "big", "near the clown" or "from small to big". */
function answerWords(round: Round): string {
  switch (round.kind) {
    case "order":
      return `from ${directionWords(round.direction)}`;
    case "distance":
      return round.ask === "near" ? "near the clown" : "far from the clown";
    case "position":
      return `${round.ask} the ring`;
    default:
      return round.ask;
  }
}

export function instruction(round: Round): string {
  if (round.kind === "order") return `Which row goes ${directionWords(round.direction)}?`;
  if (round.kind === "distance" || round.kind === "position") return `Tap the ${nameOf(round)} ${answerWords(round)}!`;
  return `Tap the ${round.ask} ${nameOf(round)}!`;
}

export function promptSpeech(round: Round): string {
  if (round.kind === "order") return `Look at the ${nameOf(round)}s. Which row goes ${answerWords(round)}? Tap that row.`;
  if (round.kind === "distance" || round.kind === "position") return `Tap the ${nameOf(round)} that is ${answerWords(round)}.`;
  return `Which ${nameOf(round)} is ${round.ask}? Tap the ${round.ask} ${nameOf(round)}.`;
}

export function correctSpeech(round: Round): string {
  return round.kind === "order" ? `Ta-da! That row goes ${answerWords(round)}!` : `Ta-da! That ${nameOf(round)} is ${answerWords(round)}!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(round: Round): string {
  return round.kind === "order"
    ? `This is the correct answer! This row goes ${answerWords(round)}.`
    : `This is the correct answer! This ${nameOf(round)} is ${answerWords(round)}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Show!";
  return score >= Math.ceil(total * 0.6) ? "Great Show!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You got ${score} out of ${total} circus acts right.`;
}
