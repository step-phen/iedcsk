// Letter strokes, i-word pictures and spoken lines for Letter i Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, dot } from "../../2nd-quarter/week-1/LetterTracePad";

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

// A short line down from the middle line to the base line first, then a tap for the dot above it.
export const STROKES = [straight({ x: 250, y: MID_Y }, { x: 250, y: BASE_Y }), dot(250, 108)];

// Keyed by the seeder's question_data.word: the picture that appears inside the snow globe.
export const WORDS = {
  iguana: { emoji: "🦎", label: "Iguana" },
  "ice cream": { emoji: "🍦", label: "Ice cream" },
  island: { emoji: "🏝️", label: "Island" },
  inchworm: { emoji: "🐛", label: "Inchworm" },
  insect: { emoji: "🐜", label: "Insect" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small i: line down, then the dot!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small i. A short line straight down from the middle line, then a dot on top. Now you try! Start at the green dot."
    : "Watch, then trace small i. Line down, then the dot.";
}

export function correctSpeech(word: Word): string {
  return `Let it snow! i is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small i!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A short line down, then a dot on top. i is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small i!";

export const DONE_MISSED = "Good try! Keep practicing small i: line down, then the dot.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
