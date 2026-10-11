// Fiesta things and spoken lines for the Q4 Math Readiness Review; things are emoji and shapes are drawn in MathReadinessReview4.tsx.

export const THINGS: Record<string, { plural: string; emoji: string }> = {
  mango: { plural: "mangoes", emoji: "🥭" },
  candy: { plural: "candies", emoji: "🍬" },
  balloon: { plural: "balloons", emoji: "🎈" },
  lantern: { plural: "lanterns", emoji: "🏮" },
};

export const SHAPES = ["circle", "square", "triangle", "rectangle"] as const;
export type Shape = (typeof SHAPES)[number];
export type Thing = keyof typeof THINGS;

export const isThing = (v: unknown): v is Thing => typeof v === "string" && v in THINGS;
export const isShape = (v: unknown): v is Shape => typeof v === "string" && (SHAPES as readonly string[]).includes(v);

export type Round =
  | { key: string; kind: "add"; object: Thing; groupA: number; groupB: number; choices: number[] }
  | { key: string; kind: "takeAway"; object: Thing; start: number; removed: number; choices: number[] }
  | { key: string; kind: "next"; sequence: number[]; choices: number[] }
  | { key: string; kind: "missing"; sequence: (number | null)[]; missing: number; choices: number[] }
  | { key: string; kind: "count"; object: Thing; count: number; choices: number[] }
  | { key: string; kind: "shape"; ask: Shape; choices: Shape[] }
  | { key: string; kind: "compare"; object: Thing; left: number; right: number; ask: "more" | "fewer" };

export function answerOf(round: Round): string {
  switch (round.kind) {
    case "add":
      return String(round.groupA + round.groupB);
    case "takeAway":
      return String(round.start - round.removed);
    case "next":
      return String(round.sequence[round.sequence.length - 1] + 1);
    case "missing":
      return String(round.missing);
    case "count":
      return String(round.count);
    case "shape":
      return round.ask;
    case "compare":
      return (round.left > round.right) === (round.ask === "more") ? "left" : "right";
  }
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

const sayList = (seq: (number | null)[]) => seq.map((n) => (n === null ? "blank" : String(n))).join(", ");

export function instruction(round: Round): string {
  switch (round.kind) {
    case "add":
      return `How many ${THINGS[round.object].plural} in all?`;
    case "takeAway":
      return `How many ${THINGS[round.object].plural} are left?`;
    case "next":
      return "What number comes next?";
    case "missing":
      return "What number is missing?";
    case "count":
      return `How many ${THINGS[round.object].plural}?`;
    case "shape":
      return `Tap the ${round.ask}!`;
    case "compare":
      return `Tap the side with ${round.ask}!`;
  }
}

export function promptSpeech(round: Round): string {
  switch (round.kind) {
    case "add":
      return `Here are ${round.groupA} ${THINGS[round.object].plural} and ${round.groupB} more. How many ${THINGS[round.object].plural} in all?`;
    case "takeAway":
      return `There were ${round.start} ${THINGS[round.object].plural}. ${round.removed} were taken away. How many are left?`;
    case "next":
      return `Count: ${sayList(round.sequence)}. What number comes next?`;
    case "missing":
      return `Count: ${sayList(round.sequence)}. What number is missing?`;
    case "count":
      return `Count the ${THINGS[round.object].plural}. Tap how many.`;
    case "shape":
      return `Find the ${round.ask}. Tap the ${round.ask}.`;
    case "compare":
      return `Which side has ${round.ask} ${THINGS[round.object].plural}? Tap that side.`;
  }
}

export function correctSpeech(round: Round): string {
  if (round.kind === "shape") return `Yes! That is the ${round.ask}!`;
  if (round.kind === "compare") return `Yes! That side has ${round.ask}!`;
  return `Yes! The answer is ${answerOf(round)}!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(round: Round): string {
  if (round.kind === "shape") return `This is the correct answer! This is the ${round.ask}.`;
  if (round.kind === "compare") return `This is the correct answer! This side has ${round.ask}.`;
  return `This is the correct answer! The answer is ${answerOf(round)}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You got ${score} out of ${total} fiesta tasks right.`;
}
