// Spoken lines for Writing Skills Review 3; the letters come from the shared Quarter 3 map, and the greeting and intro stay in lib/speech-lines.ts.

import { LETTERS, letterName } from "../week-7/thirdQuarterLetters";

export { VIEW, CAPITAL_LINES, SMALL_LINES, LETTERS, isLetter } from "../week-7/thirdQuarterLetters";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Watch, then trace each big and small letter!";

export function promptSpeech(letter: string): string {
  return `Watch the pencil write ${letterName(letter)}. ${LETTERS[letter].cue} Now you try! Start at the green dot.`;
}

export function correctSpeech(letter: string): string {
  return `Onto the shelf! Your ${letterName(letter)} is a brand-new book!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export function revealSpeech(letter: string): string {
  return `${REVEAL} ${letterName(letter)}: ${LETTERS[letter].cue}`;
}

export const DONE = "Fantastic! You traced every letter on the shelf!";

export const DONE_MISSED = "Good work! Keep practicing your big and small letters, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
