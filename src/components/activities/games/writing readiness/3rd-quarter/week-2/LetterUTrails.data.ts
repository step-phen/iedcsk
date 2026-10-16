// Letter strokes, U-word pictures and spoken lines for Letter U Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// One stroke: down the left side, around the bottom, and back up the right side.
export const U_STROKES = [chain(straight({ x: 150, y: TOP_Y }, { x: 150, y: 300 }, 24), arc(250, 300, 100, BASE_Y - 300, Math.PI, 0, 50), straight({ x: 350, y: 300 }, { x: 350, y: TOP_Y }, 24))];

// Keyed by the seeder's question_data.word: the picture an umbrella keeps dry for each U.
export const WORDS = {
  umbrella: { emoji: "☂️", label: "Umbrella" },
  unicorn: { emoji: "🦄", label: "Unicorn" },
  utensils: { emoji: "🍴", label: "Utensils" },
  ube: { emoji: "🍠", label: "Ube" },
  uniform: { emoji: "🥋", label: "Uniform" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big U: down, around, up!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital U. Start at the top, go down, curve around the bottom, and go back up. Now you try! Start at the green dot."
    : "Watch, then trace capital U. Down, around, and back up.";
}

export function correctSpeech(word: Word): string {
  return `Pop! The umbrella opens! U is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write U!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Down, around the bottom, and back up. U is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital U!";

export const DONE_MISSED = "Good try! Keep practicing capital U: down, around, then up.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
