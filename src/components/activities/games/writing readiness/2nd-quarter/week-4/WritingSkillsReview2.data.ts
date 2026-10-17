// Spoken lines for Writing Skills Review 2; the letters come from the shared Quarter 2 capital map, and the greeting and intro stay in lib/speech-lines.ts.

import { CAPITALS as LETTERS } from "../week-7/capitalLetters";

export { VIEW, TOP_Y, MID_Y, BASE_Y, CAPITALS as LETTERS, isCapital as isLetter } from "../week-7/capitalLetters";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Watch, then trace each capital letter!";

export function promptSpeech(letter: string): string {
  return `Watch the pencil write capital ${letter}. ${LETTERS[letter].cue} Now you try! Start at the green dot.`;
}

export function correctSpeech(letter: string): string {
  return `Tap, tap! Your capital ${letter} is ready!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export function revealSpeech(letter: string): string {
  return `${REVEAL} Capital ${letter}: ${LETTERS[letter].cue}`;
}

export const DONE = "Amazing! You traced every capital letter we learned!";

export const DONE_MISSED = "Good work! Keep practicing your capital letters, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
