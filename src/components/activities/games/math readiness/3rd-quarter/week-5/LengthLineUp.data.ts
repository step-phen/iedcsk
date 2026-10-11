// Lane ranks and spoken lines for Length Line-Up; the long things are drawn by week-2/LengthItem.tsx.

import { LENGTH_KINDS } from "../week-2/LengthItem";

export type Rank = "shortest" | "middle" | "longest";

/** Lane 1 to lane 3, top to bottom. */
export const RANKS: Rank[] = ["shortest", "middle", "longest"];

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

const nameOf = (kind: keyof typeof LENGTH_KINDS) => LENGTH_KINDS[kind].name;

export const INSTRUCTION = "Shortest in lane 1, longest in lane 3!";

export function promptSpeech(kind: keyof typeof LENGTH_KINDS): string {
  return `Line up the ${nameOf(kind)}s! Put the shortest one in lane one, and the longest one in lane three.`;
}

export const CORRECT: Record<Rank, string> = { shortest: "Short!", middle: "Longer!", longest: "Longest!" };

export function revealSpeech(rank: Rank, kind: keyof typeof LENGTH_KINDS): string {
  return `Oops! The ${rank} ${nameOf(kind)} goes in lane ${RANKS.indexOf(rank) + 1}.`;
}

export const DONE = "Short, longer, longest! You did it!";

export const DONE_MISSED = "Good try! Look: short, longer, longest.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You lined up ${score} out of ${total} sets from shortest to longest.`;
}
