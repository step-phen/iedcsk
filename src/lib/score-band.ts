import { PRACTICAL_RESULT_MAX, type PracticalResultValue, type ScoreBand } from "@/constants/enums";

// Digital scores and practical ratings share these colors, so every results table speaks one language.
export const RESULT_CLASS: Record<ScoreBand, string> = {
  needs_help: "bg-rose-100 text-rose-700",
  good: "bg-amber-100 text-amber-700",
  very_good: "bg-emerald-100 text-emerald-700",
};

// Cut-offs teachers see on the legends: 80%+ Very Good, 60–79% Good, below 60% Needs Help.
export function scoreBand(percent: number): ScoreBand {
  return percent >= 80 ? "very_good" : percent >= 60 ? "good" : "needs_help";
}

export function percentOf(score: number, maxScore: number) {
  return Math.round((score / maxScore) * 100);
}

// A 1–5 practical rating on the same cut-offs: 4–5 Very Good, 3 Good, 1–2 Needs Help.
export function ratingBand(rating: PracticalResultValue): ScoreBand {
  return scoreBand(percentOf(rating, PRACTICAL_RESULT_MAX));
}

// How a rating reads everywhere it is shown: "4/5".
export function ratingLabel(rating: PracticalResultValue) {
  return `${rating}/${PRACTICAL_RESULT_MAX}`;
}
