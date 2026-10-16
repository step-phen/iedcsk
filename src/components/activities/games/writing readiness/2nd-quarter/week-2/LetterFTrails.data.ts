// Letter strokes, F-word pictures and spoken lines for Letter F Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big line down, then a line across the top, then a shorter line across the middle.
export const F_STROKES = [
  straight({ x: 160, y: TOP_Y }, { x: 160, y: BASE_Y }),
  straight({ x: 160, y: TOP_Y }, { x: 350, y: TOP_Y }),
  straight({ x: 160, y: MID_Y }, { x: 310, y: MID_Y }),
];

// Keyed by the seeder's question_data.word: the picture a firefly lights up in its jar for each F.
export const WORDS = {
  fish: { emoji: "🐟", label: "Fish" },
  frog: { emoji: "🐸", label: "Frog" },
  flower: { emoji: "🌻", label: "Flower" },
  fork: { emoji: "🍴", label: "Fork" },
  flag: { emoji: "🚩", label: "Flag" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big F: down, top, middle!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital F. A big line down, then a line across the top, then a little line across the middle. Now you try! Start at the green dot."
    : "Watch, then trace capital F. Down, across the top, then across the middle.";
}

export function correctSpeech(word: Word): string {
  return `The jar lights up! F is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write F!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big line down, then across the top, then across the middle. F is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital F!";

export const DONE_MISSED = "Good try! Keep practicing capital F: down, top, then middle.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
