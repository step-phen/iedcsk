// Letter strokes, H-word pictures and spoken lines for Letter H Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big line down on the left, a big line down on the right, then a little line across the middle.
export const H_STROKES = [
  straight({ x: 150, y: TOP_Y }, { x: 150, y: BASE_Y }),
  straight({ x: 350, y: TOP_Y }, { x: 350, y: BASE_Y }),
  straight({ x: 150, y: MID_Y }, { x: 350, y: MID_Y }),
];

// Keyed by the seeder's question_data.word: the farm friend that peeks out of a barn window for each H.
export const WORDS = {
  hen: { emoji: "🐔", label: "Hen" },
  horse: { emoji: "🐴", label: "Horse" },
  hat: { emoji: "👒", label: "Hat" },
  house: { emoji: "🏡", label: "House" },
  honey: { emoji: "🍯", label: "Honey" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big H: down, down, across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital H. A big line down, another big line down, then a little line across the middle. Now you try! Start at the green dot."
    : "Watch, then trace capital H. Down, down, then across the middle.";
}

export function correctSpeech(word: Word): string {
  return `Peekaboo! H is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write H!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Down, down, then across the middle. H is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital H!";

export const DONE_MISSED = "Good try! Keep practicing capital H: down, down, then across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
