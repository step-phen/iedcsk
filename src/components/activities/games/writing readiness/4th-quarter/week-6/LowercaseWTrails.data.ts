// Letter strokes, w-word pictures and spoken lines for Letter w Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// Slant down, slant up, slant down, slant up, like two v's joined (the slants may be drawn without lifting).
export const STROKES = [
  straight({ x: 165, y: MID_Y }, { x: 205, y: BASE_Y }),
  straight({ x: 205, y: BASE_Y }, { x: 250, y: 200 }),
  straight({ x: 250, y: 200 }, { x: 295, y: BASE_Y }),
  straight({ x: 295, y: BASE_Y }, { x: 335, y: MID_Y }),
];

// Keyed by the seeder's question_data.word: the picture the whale splashes up from each wave.
export const WORDS = {
  watermelon: { emoji: "🍉", label: "Watermelon" },
  watch: { emoji: "⌚", label: "Watch" },
  worm: { emoji: "🪱", label: "Worm" },
  wolf: { emoji: "🐺", label: "Wolf" },
  wheel: { emoji: "🛞", label: "Wheel" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

const said = (word: Word) => WORDS[word].label.toLowerCase();

export const INSTRUCTION = "Watch, then trace small w: down, up, down, up!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small w. Slant down, slant up, slant down, slant up. Now you try! Start at the green dot."
    : "Watch, then trace small w. Down, up, down, up.";
}

export function correctSpeech(word: Word): string {
  return `Splash! The whale says hello! w is for ${said(word)}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small w!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Slant down, up, down, up. w is for ${said(word)}.`;
}

export const DONE = "Splendid! The whale splashed every wave! You traced every small w!";

export const DONE_MISSED = "Good try! Keep practicing small w: down, up, down, up.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
