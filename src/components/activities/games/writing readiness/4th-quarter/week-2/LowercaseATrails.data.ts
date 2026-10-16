// Letter strokes, a-word pictures and spoken lines for Letter a Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc } from "../../2nd-quarter/week-1/LetterTracePad";

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

// Circle back all the way around first, then a line straight down on the right side.
export const STROKES = [arc(240, 235, 62, 65, -Math.PI / 4, -Math.PI / 4 - 2 * Math.PI, 80), straight({ x: 302, y: MID_Y }, { x: 302, y: BASE_Y })];

// Keyed by the seeder's question_data.word: the picture that grows on the apple tree for each a.
export const WORDS = {
  apple: { emoji: "🍎", label: "Apple" },
  ant: { emoji: "🐜", label: "Ant" },
  alligator: { emoji: "🐊", label: "Alligator" },
  avocado: { emoji: "🥑", label: "Avocado" },
  anchor: { emoji: "⚓", label: "Anchor" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small a: around, then down!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small a. Circle back all the way around, then a line straight down. Now you try! Start at the green dot."
    : "Watch, then trace small a. Circle around, then down.";
}

export function correctSpeech(word: Word): string {
  return `It grew on the tree! a is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small a!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Circle all the way around, then a line down. a is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small a!";

export const DONE_MISSED = "Good try! Keep practicing small a: around, then down.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
