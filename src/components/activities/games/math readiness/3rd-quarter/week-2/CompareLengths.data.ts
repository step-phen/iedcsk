// Round checks and spoken lines for Compare Lengths; the long things themselves are drawn by LengthItem.tsx.

import { LENGTH_KINDS } from "./LengthItem";

export type Ask = "long" | "short";

export function isAsk(value: unknown): value is Ask {
  return value === "long" || value === "short";
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

const nameOf = (kind: keyof typeof LENGTH_KINDS) => LENGTH_KINDS[kind].name;

export function instruction(ask: Ask, kind: keyof typeof LENGTH_KINDS): string {
  return `Tap the ${ask} ${nameOf(kind)}!`;
}

export function promptSpeech(ask: Ask, kind: keyof typeof LENGTH_KINDS): string {
  return `Both ${nameOf(kind)}s start at the red line. Look where they end, then tap the ${ask} ${nameOf(kind)}!`;
}

export function correctSpeech(ask: Ask, kind: keyof typeof LENGTH_KINDS): string {
  return `Yes! That is the ${ask} ${nameOf(kind)}!`;
}

export function revealSpeech(ask: Ask, kind: keyof typeof LENGTH_KINDS): string {
  return `Oops! This one is the ${ask} ${nameOf(kind)}. See where it ends?`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You compared ${score} out of ${total} lengths.`;
}
