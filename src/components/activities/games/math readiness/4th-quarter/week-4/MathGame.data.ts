// Toy shop things and spoken lines for Math Game; toys are emoji and shapes are drawn in MathGame.tsx.

export const TOYS: Record<string, { plural: string; emoji: string }> = {
  ball: { plural: "balls", emoji: "⚽" },
  car: { plural: "toy cars", emoji: "🚗" },
  teddy: { plural: "teddy bears", emoji: "🧸" },
  balloon: { plural: "balloons", emoji: "🎈" },
  drum: { plural: "drums", emoji: "🥁" },
};

export const SHAPES = ["circle", "square", "triangle", "rectangle"] as const;
export type Shape = (typeof SHAPES)[number];

export const isToy = (v: unknown): v is keyof typeof TOYS => typeof v === "string" && v in TOYS;
export const isShape = (v: unknown): v is Shape => typeof v === "string" && (SHAPES as readonly string[]).includes(v);

export type Round =
  | { key: string; kind: "count"; toy: keyof typeof TOYS; count: number; choices: number[] }
  | { key: string; kind: "shape"; ask: Shape; choices: Shape[] }
  | { key: string; kind: "countShape"; ask: Shape; shapes: Shape[]; choices: number[] };

export function answerOf(round: Round): string {
  if (round.kind === "count") return String(round.count);
  if (round.kind === "shape") return round.ask;
  return String(round.shapes.filter((s) => s === round.ask).length);
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export function instruction(round: Round): string {
  if (round.kind === "count") return `How many ${TOYS[round.toy].plural}?`;
  if (round.kind === "shape") return `Tap the ${round.ask}!`;
  return `How many ${round.ask}s?`;
}

export function promptSpeech(round: Round): string {
  if (round.kind === "count") return `Count the ${TOYS[round.toy].plural} on the shelf. Then tap the number that shows how many.`;
  if (round.kind === "shape") return `Find the ${round.ask}. Tap the ${round.ask}.`;
  return `Look at all the shapes. Count only the ${round.ask}s, then tap the number.`;
}

export function correctSpeech(round: Round): string {
  if (round.kind === "count") return `Yes! There are ${round.count} ${TOYS[round.toy].plural}!`;
  if (round.kind === "shape") return `Yes! That is the ${round.ask}!`;
  return `Yes! There are ${answerOf(round)} ${round.ask}s!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(round: Round): string {
  if (round.kind === "count") return `This is the correct answer! There are ${round.count} ${TOYS[round.toy].plural}.`;
  if (round.kind === "shape") return `This is the correct answer! This is the ${round.ask}.`;
  return `This is the correct answer! There are ${answerOf(round)} ${round.ask}s.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You solved ${score} out of ${total} toy shop tasks.`;
}
