import type { PracticalResultValue } from "@/constants/enums";

// Digital scores share the practical ratings' colors, so every results table speaks one language.
export const RESULT_CLASS: Record<PracticalResultValue, string> = {
  needs_help: "bg-rose-100 text-rose-700",
  good: "bg-amber-100 text-amber-700",
  very_good: "bg-emerald-100 text-emerald-700",
};

// Cut-offs teachers see on the legends: 80%+ Very Good, 60–79% Good, below 60% Needs Help.
export function scoreBand(percent: number): PracticalResultValue {
  return percent >= 80 ? "very_good" : percent >= 60 ? "good" : "needs_help";
}

export function percentOf(score: number, maxScore: number) {
  return Math.round((score / maxScore) * 100);
}
