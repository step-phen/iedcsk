// Letter strokes, T-word pictures and spoken lines for Letter T Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "./LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
// The writing lines the T sits on: top line, dashed middle line, base line.
export const TOP_Y = 90;
export const MID_Y = 255;
export const BASE_Y = 420;

// Across the top first, then down the middle.
export const T_STROKES = [straight({ x: 110, y: TOP_Y }, { x: 390, y: TOP_Y }), straight({ x: 250, y: TOP_Y }, { x: 250, y: BASE_Y })];

// Keyed by the seeder's question_data.word: the hidden picture each traced T uncovers.
export const WORDS = {
  tiger: { emoji: "🐯", label: "Tiger" },
  tent: { emoji: "⛺", label: "Tent" },
  train: { emoji: "🚂", label: "Train" },
  turtle: { emoji: "🐢", label: "Turtle" },
  tomato: { emoji: "🍅", label: "Tomato" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big T: across, then down!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital T. Across the top, then down the middle. Now you try! Start at the green dot."
    : "Watch, then trace capital T. Across the top, then down the middle.";
}

export function correctSpeech(word: Word): string {
  return `Great tracing! T is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write T!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Across the top, then down the middle. T is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital T!";

export const DONE_MISSED = "Good try! Keep practicing capital T: across, then down.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
