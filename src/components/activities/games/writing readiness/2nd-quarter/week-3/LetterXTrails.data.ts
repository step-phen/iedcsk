// Letter strokes, X-word pictures and spoken lines for Letter X Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big slant down from the left corner, then a big slant down from the right corner, crossing in the middle.
export const X_STROKES = [straight({ x: 140, y: TOP_Y }, { x: 360, y: BASE_Y }), straight({ x: 360, y: TOP_Y }, { x: 140, y: BASE_Y })];

// Keyed by the seeder's question_data.word: the treasure in each chest; few words start with X, so these all end with it.
export const WORDS = {
  fox: { emoji: "🦊", label: "Fox" },
  box: { emoji: "📦", label: "Box" },
  ox: { emoji: "🐂", label: "Ox" },
  trex: { emoji: "🦖", label: "T-rex" },
  six: { emoji: "6️⃣", label: "Six" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big X: slant, then slant!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital X. A big slant down from this side, then a big slant down from the other side. X marks the spot! Now you try! Start at the green dot."
    : "Watch, then trace capital X. Slant down, then slant down the other way.";
}

export function correctSpeech(word: Word): string {
  return `X marks the spot! ${WORDS[word].label} ends with x!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write X!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big slant down, then a big slant down the other way. ${WORDS[word].label} ends with x.`;
}

export const DONE = "Hooray! You traced every capital X!";

export const DONE_MISSED = "Good try! Keep practicing capital X: slant down, then slant down the other way.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
