// Letter strokes, W-word pictures and spoken lines for Letter W Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// Slant down, slant up, slant down, slant up; each slant starts where the last ended, so one unlifted stroke also counts.
const W_POINTS = [
  { x: 70, y: TOP_Y },
  { x: 160, y: BASE_Y },
  { x: 250, y: TOP_Y },
  { x: 340, y: BASE_Y },
  { x: 430, y: TOP_Y },
];
export const W_STROKES = W_POINTS.slice(1).map((p, i) => straight(W_POINTS[i], p));

// Keyed by the seeder's question_data.word: the picture each gust of wind carries over the hill.
export const WORDS = {
  watermelon: { emoji: "🍉", label: "Watermelon" },
  whale: { emoji: "🐋", label: "Whale" },
  worm: { emoji: "🪱", label: "Worm" },
  watch: { emoji: "⌚", label: "Watch" },
  wolf: { emoji: "🐺", label: "Wolf" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big W: down, up, down, up!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital W. Slant down, slant up, slant down, slant up. Two valleys, like the wind going over the hills! Now you try! Start at the green dot."
    : "Watch, then trace capital W. Down, up, down, up.";
}

export function correctSpeech(word: Word): string {
  return `Whoosh! The windmill spins! ${WORDS[word].label} starts with W!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write W!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Slant down, slant up, slant down, slant up. ${WORDS[word].label} starts with W.`;
}

export const DONE = "Wonderful! You traced every capital W!";

export const DONE_MISSED = "Good try! Keep practicing capital W: down, up, down, up.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
