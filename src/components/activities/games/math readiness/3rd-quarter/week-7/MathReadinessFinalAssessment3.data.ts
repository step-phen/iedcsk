// Space things and spoken lines for the Q3 Math Readiness Final Assessment; comets and the glass dome are drawn in MathReadinessFinalAssessment3.tsx.

export type Size = "big" | "small";
export type Length = "long" | "short";
export type Step = "small" | "medium" | "big";
export type Distance = "near" | "far";
export type Position = "inside" | "outside";

export const STEPS: Step[] = ["small", "medium", "big"];

export const THINGS: Record<string, { name: string; emoji: string }> = {
  planet: { name: "planet", emoji: "🪐" },
  moon: { name: "moon", emoji: "🌕" },
  rocket: { name: "rocket", emoji: "🚀" },
  star: { name: "star", emoji: "⭐" },
  alien: { name: "alien", emoji: "👽" },
  ufo: { name: "flying saucer", emoji: "🛸" },
  astronaut: { name: "astronaut", emoji: "🧑‍🚀" },
  robot: { name: "robot", emoji: "🤖" },
};

export function isThing(value: unknown): value is keyof typeof THINGS {
  return typeof value === "string" && value in THINGS;
}

export const LONG_THINGS = { comet: { name: "comet" } } as const;

export type LongThing = keyof typeof LONG_THINGS;

export function isLongThing(value: unknown): value is LongThing {
  return typeof value === "string" && value in LONG_THINGS;
}

export type Round =
  | { key: string; kind: "size"; object: keyof typeof THINGS; ask: Size }
  | { key: string; kind: "length"; object: LongThing; ask: Length }
  | { key: string; kind: "order"; object: keyof typeof THINGS; missing: Step }
  | { key: string; kind: "distance"; object: keyof typeof THINGS; ask: Distance; side: "left" | "right" }
  | { key: string; kind: "position"; object: keyof typeof THINGS; ask: Position };

/** The choice id that answers the round, which is also what gets submitted. */
export const answerOf = (round: Round) => (round.kind === "order" ? round.missing : round.ask);

export const nameOf = (round: Round) => (round.kind === "length" ? LONG_THINGS[round.object].name : THINGS[round.object].name);

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

/** What the right answer is, e.g. "big", "near the moon" or "inside the dome". */
function answerWords(round: Round): string {
  switch (round.kind) {
    case "order":
      return round.missing;
    case "distance":
      return round.ask === "near" ? "near the moon" : "far from the moon";
    case "position":
      return `${round.ask} the dome`;
    default:
      return round.ask;
  }
}

export function instruction(round: Round): string {
  if (round.kind === "order") return "Which one fills the gap?";
  if (round.kind === "distance" || round.kind === "position") return `Tap the ${nameOf(round)} ${answerWords(round)}!`;
  return `Tap the ${round.ask} ${nameOf(round)}!`;
}

export function promptSpeech(round: Round): string {
  if (round.kind === "order") return `The ${nameOf(round)}s go from small to big. One is missing. Tap the one that fills the gap.`;
  if (round.kind === "distance" || round.kind === "position") return `Tap the ${nameOf(round)} that is ${answerWords(round)}.`;
  return `Tap the ${round.ask} ${nameOf(round)}.`;
}

export function correctSpeech(round: Round): string {
  if (round.kind === "order") return `Blast off! The ${round.missing} ${nameOf(round)} fills the gap!`;
  return `Blast off! That ${nameOf(round)} is ${answerWords(round)}!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(round: Round): string {
  if (round.kind === "order") return `This is the correct answer! The ${round.missing} ${nameOf(round)} fills the gap.`;
  return `This is the correct answer! This ${nameOf(round)} is ${answerWords(round)}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You answered ${score} out of ${total} space tasks correctly.`;
}
