// Letter strokes, P-word stickers and spoken lines for Letter P Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// Straight down first, then back to the top for the small curve around to the middle.
export const P_STROKES = [
  straight({ x: 160, y: TOP_Y }, { x: 160, y: BASE_Y }),
  chain(straight({ x: 160, y: TOP_Y }, { x: 240, y: TOP_Y }, 8), arc(240, (TOP_Y + MID_Y) / 2, 95, (MID_Y - TOP_Y) / 2, -Math.PI / 2, Math.PI / 2, 50), straight({ x: 240, y: MID_Y }, { x: 160, y: MID_Y }, 8)),
];

// Keyed by the seeder's question_data.word: the sticker stamped on the canvas for each P.
export const WORDS = {
  pig: { emoji: "🐷", label: "Pig" },
  pear: { emoji: "🍐", label: "Pear" },
  pencil: { emoji: "✏️", label: "Pencil" },
  panda: { emoji: "🐼", label: "Panda" },
  pizza: { emoji: "🍕", label: "Pizza" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big P: down, then a small curve!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital P. Straight down, then back to the top and a small curve around to the middle. Now you try! Start at the green dot."
    : "Watch, then trace capital P. Straight down, then a small curve to the middle.";
}

export function correctSpeech(word: Word): string {
  return `What a painting! P is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write P!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Straight down, then a small curve to the middle. P is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital P!";

export const DONE_MISSED = "Good try! Keep practicing capital P: down, then a small curve.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
