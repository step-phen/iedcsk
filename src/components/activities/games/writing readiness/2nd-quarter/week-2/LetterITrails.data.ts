// Letter strokes, I-word pictures and spoken lines for Letter I Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big line down, then a little line across the top, then a little line across the bottom.
export const I_STROKES = [
  straight({ x: 250, y: TOP_Y }, { x: 250, y: BASE_Y }),
  straight({ x: 165, y: TOP_Y }, { x: 335, y: TOP_Y }),
  straight({ x: 165, y: BASE_Y }, { x: 335, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture frozen in each ice cube until its I is traced.
export const WORDS = {
  iguana: { emoji: "🦎", label: "Iguana" },
  icecream: { emoji: "🍦", label: "Ice cream" },
  island: { emoji: "🏝️", label: "Island" },
  insect: { emoji: "🐜", label: "Insect" },
  inchworm: { emoji: "🐛", label: "Inchworm" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big I: down, top, bottom!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital I. A big line down, then a little line across the top, and a little line across the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital I. Down, across the top, then across the bottom.";
}

export function correctSpeech(word: Word): string {
  return `You melted the ice! I is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write I!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big line down, then across the top, then across the bottom. I is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital I!";

export const DONE_MISSED = "Good try! Keep practicing capital I: down, top, then bottom.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
