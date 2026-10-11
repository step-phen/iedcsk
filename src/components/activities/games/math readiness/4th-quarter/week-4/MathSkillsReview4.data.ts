// Station materials and spoken lines for Math Skills Review 4; materials are emoji and shapes are drawn in MathSkillsReview4.tsx.

export const MATERIALS: Record<string, { plural: string; emoji: string }> = {
  leaf: { plural: "leaves", emoji: "🍃" },
  shell: { plural: "shells", emoji: "🐚" },
  balloon: { plural: "balloons", emoji: "🎈" },
  apple: { plural: "apples", emoji: "🍎" },
};

export const SHAPES = ["circle", "square", "triangle", "rectangle"] as const;
export type Shape = (typeof SHAPES)[number];
export type Material = keyof typeof MATERIALS;

export const isMaterial = (v: unknown): v is Material => typeof v === "string" && v in MATERIALS;
export const isShape = (v: unknown): v is Shape => typeof v === "string" && (SHAPES as readonly string[]).includes(v);

export type Round =
  | { key: string; kind: "count"; object: Material; count: number; choices: number[] }
  | { key: string; kind: "add"; object: Material; groupA: number; groupB: number; choices: number[] }
  | { key: string; kind: "takeAway"; object: Material; start: number; removed: number; choices: number[] }
  | { key: string; kind: "shape"; ask: Shape; choices: Shape[] }
  | { key: string; kind: "pattern"; sequence: Shape[]; choices: Shape[] }
  | { key: string; kind: "compare"; object: Material; left: number; right: number; ask: "more" | "fewer" };

export function answerOf(round: Round): string {
  switch (round.kind) {
    case "count":
      return String(round.count);
    case "add":
      return String(round.groupA + round.groupB);
    case "takeAway":
      return String(round.start - round.removed);
    case "shape":
      return round.ask;
    case "pattern":
      return round.sequence[round.sequence.length % 2 === 0 ? 0 : 1];
    case "compare":
      return (round.left > round.right) === (round.ask === "more") ? "left" : "right";
  }
}

export const STATION: Record<Round["kind"], { label: string; icon: string }> = {
  count: { label: "Counting", icon: "🔢" },
  add: { label: "Adding", icon: "➕" },
  takeAway: { label: "Taking Away", icon: "➖" },
  shape: { label: "Shapes", icon: "🔺" },
  pattern: { label: "Patterns", icon: "🔁" },
  compare: { label: "Comparing", icon: "⚖️" },
};

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export function instruction(round: Round): string {
  switch (round.kind) {
    case "count":
      return `How many ${MATERIALS[round.object].plural}?`;
    case "add":
      return `How many ${MATERIALS[round.object].plural} in all?`;
    case "takeAway":
      return `How many ${MATERIALS[round.object].plural} are left?`;
    case "shape":
      return `Tap the ${round.ask}!`;
    case "pattern":
      return "What comes next?";
    case "compare":
      return `Tap the group with ${round.ask}!`;
  }
}

export function promptSpeech(round: Round): string {
  const plural = round.kind === "shape" || round.kind === "pattern" ? "" : MATERIALS[round.object].plural;
  switch (round.kind) {
    case "count":
      return `Counting station. Count the ${plural}, then tap the number.`;
    case "add":
      return `Adding station. Here are ${round.groupA} ${plural} and ${round.groupB} more ${plural}. How many ${plural} in all?`;
    case "takeAway":
      return `Taking away station. There were ${round.start} ${plural}. ${round.removed} went away. How many ${plural} are left?`;
    case "shape":
      return `Shapes station. Tap the ${round.ask}.`;
    case "pattern":
      return `Patterns station. Look at the pattern: ${round.sequence.join(", ")}. What comes next?`;
    case "compare":
      return `Comparing station. Tap the group with ${round.ask} ${plural}.`;
  }
}

export function correctSpeech(round: Round): string {
  switch (round.kind) {
    case "shape":
      return `Yes! That is the ${round.ask}!`;
    case "pattern":
      return `Yes! The ${answerOf(round)} comes next!`;
    case "compare":
      return `Yes! That group has ${round.ask}!`;
    default:
      return `Yes! The answer is ${answerOf(round)}!`;
  }
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(round: Round): string {
  switch (round.kind) {
    case "shape":
      return `This is the correct answer! This is the ${round.ask}.`;
    case "pattern":
      return `This is the correct answer! The ${answerOf(round)} comes next.`;
    case "compare":
      return `This is the correct answer! This group has ${round.ask}.`;
    default:
      return `This is the correct answer! The answer is ${answerOf(round)}.`;
  }
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You finished ${score} out of ${total} stations correctly.`;
}
