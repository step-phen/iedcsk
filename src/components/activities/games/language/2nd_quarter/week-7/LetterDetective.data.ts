// Sticky-note colors and spoken lines for Letter Detective (Clue Board); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const NOTE_COLORS = ["#fff3bf", "#d3f9d8", "#ffdeeb", "#d0ebff"];

export const LOADING = "Pinning up the clues…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Shown and heard: the clue names the letter and whether it is big or small, and the child finds that form among look-alikes. */
export function instruction(target: string): string {
  return `Tap ${caseName(target)} ${target}!`;
}

export function promptSpeech(target: string): string {
  return `Detective, find ${caseName(target)} ${target}.`;
}

export function correctSpeech(target: string): string {
  return `Case solved! That is ${caseName(target)} ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is ${caseName(target)} ${target}.`;
}

export const DONE = "Great detective work! You solved every case!";

export const DONE_MISSED = "Good try, detective! Keep looking closely at big and small letters.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
