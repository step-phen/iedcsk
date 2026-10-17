// Letter strokes, B-word pictures and spoken lines for Letter B Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 245;
export const BASE_Y = 420;

const LEFT_X = 160;

// A long line down, a small bump from the top to the middle, then a bigger bump from the middle to the base; the bumps meet, so they may be drawn as one.
export const B_STROKES = [
  straight({ x: LEFT_X, y: TOP_Y }, { x: LEFT_X, y: BASE_Y }),
  chain(
    straight({ x: LEFT_X, y: TOP_Y }, { x: 235, y: TOP_Y }, 8),
    arc(235, (TOP_Y + MID_Y) / 2, 85, (MID_Y - TOP_Y) / 2, -Math.PI / 2, Math.PI / 2, 50),
    straight({ x: 235, y: MID_Y }, { x: LEFT_X, y: MID_Y }, 8),
  ),
  chain(
    straight({ x: LEFT_X, y: MID_Y }, { x: 250, y: MID_Y }, 8),
    arc(250, (MID_Y + BASE_Y) / 2, 100, (BASE_Y - MID_Y) / 2, -Math.PI / 2, Math.PI / 2, 55),
    straight({ x: 250, y: BASE_Y }, { x: LEFT_X, y: BASE_Y }, 8),
  ),
];

// Keyed by the seeder's question_data.word: the picture a bee brings back to the flower.
export const WORDS = {
  ball: { emoji: "⚽", label: "Ball" },
  bus: { emoji: "🚌", label: "Bus" },
  banana: { emoji: "🍌", label: "Banana" },
  bear: { emoji: "🐻", label: "Bear" },
  book: { emoji: "📖", label: "Book" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big B: line down, bump, bump!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital B. First, a long line down. Then a small bump at the top, and a bigger bump at the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital B. Line down, small bump, big bump.";
}

export function correctSpeech(word: Word): string {
  return `Buzz buzz! The bee found a ${WORDS[word].label.toLowerCase()}! ${WORDS[word].label} starts with B!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write B!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A long line down, a small bump, then a big bump. ${WORDS[word].label} starts with B.`;
}

export const DONE = "Bravo! You traced every capital B!";

export const DONE_MISSED = "Good try! Keep practicing capital B: line down, small bump, big bump.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
