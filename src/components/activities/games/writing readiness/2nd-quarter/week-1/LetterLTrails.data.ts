// Letter strokes, L-word pictures and spoken lines for Letter L Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "./LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
// Spacing of the dot paper the L is traced on.
export const DOT_GAP = 50;

// Straight down first, then across the bottom; they meet at the corner, so one unlifted stroke also counts.
export const L_STROKES = [straight({ x: 165, y: 80 }, { x: 165, y: 420 }), straight({ x: 165, y: 420 }, { x: 375, y: 420 })];

// Keyed by the seeder's question_data.word: the picture that hops onto a lily pad for each L.
export const WORDS = {
  lion: { emoji: "🦁", label: "Lion" },
  lemon: { emoji: "🍋", label: "Lemon" },
  leaf: { emoji: "🍃", label: "Leaf" },
  ladybug: { emoji: "🐞", label: "Ladybug" },
  lollipop: { emoji: "🍭", label: "Lollipop" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big L: down, then across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital L. Straight down, then across the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital L. Straight down, then across the bottom.";
}

export function correctSpeech(word: Word): string {
  return `Wonderful! L is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Let's watch the pencil again.";

export const REVEAL = "This is the correct way to write L!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Straight down, then across the bottom. L is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Splash! You traced every capital L!";

export const DONE_MISSED = "Good try! Keep practicing capital L: down, then across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
