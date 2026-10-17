// Letter strokes, M-word pictures and spoken lines for Letter M Trails; the greeting and intro stay in lib/speech-lines.ts.

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
const VALLEY = { x: 250, y: 330 };

// A line down on the left, then from the top a slant down, a slant up and a line down; the last three meet, so they may be drawn as one.
export const M_STROKES = [
  straight({ x: LEFT_X, y: TOP_Y }, { x: LEFT_X, y: BASE_Y }),
  straight({ x: LEFT_X, y: TOP_Y }, VALLEY),
  straight(VALLEY, { x: RIGHT_X, y: TOP_Y }),
  straight({ x: RIGHT_X, y: TOP_Y }, { x: RIGHT_X, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture on the flag at the summit.
export const WORDS = {
  monkey: { emoji: "🐒", label: "Monkey" },
  moon: { emoji: "🌙", label: "Moon" },
  mango: { emoji: "🥭", label: "Mango" },
  mouse: { emoji: "🐭", label: "Mouse" },
  milk: { emoji: "🥛", label: "Milk" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big M: down, slant, slant, down!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital M. First, a line down. Go back to the top, then slant down, slant up, and a line down. Now you try! Start at the green dot."
    : "Watch, then trace capital M. Line down, slant down, slant up, line down.";
}

export function correctSpeech(word: Word): string {
  return `Up, up, to the top! ${WORDS[word].label} starts with M!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write M!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Line down, then slant down, slant up, and line down. ${WORDS[word].label} starts with M.`;
}

export const DONE = "Marvelous! You traced every capital M!";

export const DONE_MISSED = "Good try! Keep practicing capital M: down, slant, slant, down.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
