// Letter strokes, K-word pictures and spoken lines for Letter K Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

const STEM_X = 140;
const JOINT = { x: STEM_X, y: MID_Y };

// A line down, then from the top right a slant in to the middle of the line and a slant out to the base; the two slants meet, so they may be drawn as one.
export const K_STROKES = [
  straight({ x: STEM_X, y: TOP_Y }, { x: STEM_X, y: BASE_Y }),
  straight({ x: 370, y: TOP_Y }, JOINT),
  straight(JOINT, { x: 370, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture pinned on the bulletin board.
export const WORDS = {
  kite: { emoji: "🪁", label: "Kite" },
  key: { emoji: "🔑", label: "Key" },
  kangaroo: { emoji: "🦘", label: "Kangaroo" },
  king: { emoji: "🤴", label: "King" },
  koala: { emoji: "🐨", label: "Koala" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big K: down, slant in, slant out!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital K. First, a line down. Then start at the top right, slant in to the middle, and slant out to the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital K. Line down, slant in, slant out.";
}

export function correctSpeech(word: Word): string {
  return `Pin it up! ${WORDS[word].label} starts with K!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write K!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Line down, then slant in and slant out. ${WORDS[word].label} starts with K.`;
}

export const DONE = "Awesome! You traced every capital K!";

export const DONE_MISSED = "Good try! Keep practicing capital K: down, slant in, slant out.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
