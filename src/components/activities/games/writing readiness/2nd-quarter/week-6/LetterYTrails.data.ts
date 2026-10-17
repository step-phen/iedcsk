// Letter strokes, Y-word pictures and spoken lines for Letter Y Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

const FORK = { x: 250, y: MID_Y };

// A slant down to the middle, a slant down from the right to meet it, then a line down; the second slant runs into the line, so they may be drawn as one.
export const Y_STROKES = [
  straight({ x: 110, y: TOP_Y }, FORK),
  straight({ x: 390, y: TOP_Y }, FORK),
  straight(FORK, { x: FORK.x, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture that pops out of the yarn basket.
export const WORDS = {
  yoyo: { emoji: "🪀", label: "Yo-yo" },
  yarn: { emoji: "🧶", label: "Yarn" },
  yacht: { emoji: "⛵", label: "Yacht" },
  yawn: { emoji: "🥱", label: "Yawn" },
  yolk: { emoji: "🍳", label: "Yolk" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big Y: slant, slant, line down!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital Y. Slant down to the middle. Then start at the top right, slant down to meet it, and a line down. Now you try! Start at the green dot."
    : "Watch, then trace capital Y. Slant, slant, line down.";
}

export function correctSpeech(word: Word): string {
  return `Yippee! ${WORDS[word].label} starts with Y!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write Y!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Slant down, slant down to meet it, then a line down. ${WORDS[word].label} starts with Y.`;
}

export const DONE = "Yay! You traced every capital Y!";

export const DONE_MISSED = "Good try! Keep practicing capital Y: slant, slant, line down.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
