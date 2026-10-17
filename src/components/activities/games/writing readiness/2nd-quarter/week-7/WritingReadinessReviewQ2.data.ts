// Spoken lines for the Quarter 2 Writing Readiness Review; the letters come from the shared capital map, and the greeting and intro stay in lib/speech-lines.ts.

import { CAPITALS } from "./capitalLetters";

export { VIEW, TOP_Y, MID_Y, BASE_Y, CAPITALS, isCapital } from "./capitalLetters";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Watch the pencil, then trace each letter!";

export function promptSpeech(letter: string): string {
  return `Watch the pencil write capital ${letter}. ${CAPITALS[letter].cue} Now you try! Start at the green dot.`;
}

export function correctSpeech(letter: string): string {
  return `Stamped and mailed! Your capital ${letter} is on its way!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export function revealSpeech(letter: string): string {
  return `${REVEAL} Capital ${letter}: ${CAPITALS[letter].cue}`;
}

export const DONE = "Special delivery! You traced every capital letter!";

export const DONE_MISSED = "Good work! Keep practicing your capital letters, and watch the pencil closely.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
