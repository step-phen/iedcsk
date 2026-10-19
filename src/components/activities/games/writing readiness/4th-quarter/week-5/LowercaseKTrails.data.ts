// Letter strokes, k-word pictures and spoken lines for Letter k Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
// The four writing lines a small letter uses: top, dashed middle, base, and the tail line below the base.
export const TOP_Y = 60;
export const MID_Y = 170;
export const BASE_Y = 300;
export const TAIL_Y = 430;

// A tall line down from the top line first, then slant in to the line, then slant out to the base (the two slants may be one stroke).
const ELBOW = { x: 200, y: 240 };
export const STROKES = [straight({ x: 200, y: TOP_Y }, { x: 200, y: BASE_Y }), straight({ x: 300, y: MID_Y }, ELBOW), straight(ELBOW, { x: 300, y: BASE_Y })];

// Keyed by the seeder's question_data.word: the picture behind each castle door the key opens.
export const WORDS = {
  king: { emoji: "🤴", label: "King" },
  kangaroo: { emoji: "🦘", label: "Kangaroo" },
  koala: { emoji: "🐨", label: "Koala" },
  kite: { emoji: "🪁", label: "Kite" },
  kitten: { emoji: "🐱", label: "Kitten" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small k: tall line, slant in, slant out!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small k. A tall line down, then slant in, and slant out. Now you try! Start at the green dot."
    : "Watch, then trace small k. Tall line down, slant in, slant out.";
}

export function correctSpeech(word: Word): string {
  return `Click! The door swings open! k is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small k!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A tall line down, then slant in, and slant out. k is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You opened every castle door with small k!";

export const DONE_MISSED = "Good try! Keep practicing small k: tall line down, slant in, slant out.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
