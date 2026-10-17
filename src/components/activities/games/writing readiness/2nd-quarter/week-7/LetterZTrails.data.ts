// Letter strokes, Z-word pictures and spoken lines for Letter Z Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

const LEFT_X = 110;
const RIGHT_X = 390;

// Across the top, a slant down to the left, then across the bottom; all three meet, so Z may be drawn in one go.
export const Z_STROKES = [
  straight({ x: LEFT_X, y: TOP_Y }, { x: RIGHT_X, y: TOP_Y }),
  straight({ x: RIGHT_X, y: TOP_Y }, { x: LEFT_X, y: BASE_Y }),
  straight({ x: LEFT_X, y: BASE_Y }, { x: RIGHT_X, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture that rides down the zip line.
export const WORDS = {
  zebra: { emoji: "🦓", label: "Zebra" },
  zero: { emoji: "0️⃣", label: "Zero" },
  zigzag: { emoji: "⚡", label: "Zigzag" },
  zipper: { emoji: "🤐", label: "Zipper" },
  zucchini: { emoji: "🥒", label: "Zucchini" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big Z: across, slant, across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital Z. Across the top, slant down to the left, then across the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital Z. Across, slant down, across.";
}

export function correctSpeech(word: Word): string {
  return `Zoom! Down the zip line! ${WORDS[word].label} starts with Z!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write Z!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Across the top, slant down, then across the bottom. ${WORDS[word].label} starts with Z.`;
}

export const DONE = "Zippy! You traced every capital Z!";

export const DONE_MISSED = "Good try! Keep practicing capital Z: across, slant, across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
