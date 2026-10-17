// Spoken lines for the Quarter 3 Writing Readiness Final Assessment; the letters come from the shared Quarter 3 map, and the greeting and intro stay in lib/speech-lines.ts.

import { LETTERS, letterName } from "./thirdQuarterLetters";

export { VIEW, CAPITAL_LINES, SMALL_LINES, LETTERS, isLetter } from "./thirdQuarterLetters";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Trace each big and small letter all by yourself!";

// No modelled strokes before the try: the assessment checks the child can form the letter alone.
export function promptSpeech(letter: string): string {
  return `Trace ${letterName(letter)} all by yourself. Start at the green dot.`;
}

export function correctSpeech(letter: string): string {
  return `Treasure found! Your ${letterName(letter)} is a gold coin!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export function revealSpeech(letter: string): string {
  return `${REVEAL} ${letterName(letter)}: ${LETTERS[letter].cue}`;
}

export const DONE = "Wonderful! You traced every big and small letter all by yourself!";

export const DONE_MISSED = "Good effort! Keep practicing your big and small letters, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
