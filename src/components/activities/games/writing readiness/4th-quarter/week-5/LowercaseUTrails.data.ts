// Letter strokes, u-word pictures and spoken lines for Letter u Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

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

// Down, curve around the bottom and back up to the middle line first, then a line straight down on the right (the two may be one stroke).
export const STROKES = [
  chain(straight({ x: 205, y: MID_Y }, { x: 205, y: 250 }, 20), arc(250, 250, 45, 50, Math.PI, 0, 40), straight({ x: 295, y: 250 }, { x: 295, y: MID_Y }, 20)),
  straight({ x: 295, y: MID_Y }, { x: 295, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture sheltering under each umbrella that opens.
export const WORDS = {
  unicorn: { emoji: "🦄", label: "Unicorn" },
  ufo: { emoji: "🛸", label: "UFO" },
  up: { emoji: "⬆️", label: "Up" },
  uniform: { emoji: "🥋", label: "Uniform" },
  utensils: { emoji: "🍴", label: "Utensils" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small u: down, around, up, and down!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small u. Go down, curve around, go back up, then a line down. Now you try! Start at the green dot."
    : "Watch, then trace small u. Down, around, up, and down.";
}

// UFO is said letter by letter, so it is not lowercased into a word.
const said = (word: Word) => (word === "ufo" ? "U F O" : WORDS[word].label.toLowerCase());

export function correctSpeech(word: Word): string {
  return `Pop! The umbrella opens! u is for ${said(word)}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small u!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Down, around, back up, then a line down. u is for ${said(word)}.`;
}

export const DONE = "Hooray! Every umbrella is open! You traced every small u!";

export const DONE_MISSED = "Good try! Keep practicing small u: down, around, up, and down.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
