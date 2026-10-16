// Letter strokes, s-word pictures and spoken lines for Letter s Trails; the greeting and intro stay in lib/speech-lines.ts.

import { arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

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

// One stroke: a little curve back at the top, then curve around the other way at the bottom.
export const STROKES = [chain(arc(245, 202, 48, 32, -Math.PI / 6, (-3 * Math.PI) / 2, 40), arc(245, 266, 48, 32, -Math.PI / 2, (5 * Math.PI) / 6, 40))];

// Keyed by the seeder's question_data.word: the picture on each leaf the snail reaches for each s.
export const WORDS = {
  seal: { emoji: "🦭", label: "Seal" },
  spoon: { emoji: "🥄", label: "Spoon" },
  strawberry: { emoji: "🍓", label: "Strawberry" },
  sheep: { emoji: "🐑", label: "Sheep" },
  scissors: { emoji: "✂️", label: "Scissors" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small s: curve back, curve around!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small s. A little curve back, then curve around the other way. Now you try! Start at the green dot."
    : "Watch, then trace small s. Curve back, then curve around.";
}

export function correctSpeech(word: Word): string {
  return `The snail slides along! s is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small s!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A little curve back, then around the other way. s is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small s!";

export const DONE_MISSED = "Good try! Keep practicing small s: curve back, then curve around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
