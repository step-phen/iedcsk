// Letter strokes, t-word pictures and spoken lines for Letter t Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// A tall line down from the top line, then a short line across on the middle line.
export const STROKES = [straight({ x: 250, y: TOP_Y }, { x: 250, y: BASE_Y }), straight({ x: 190, y: MID_Y }, { x: 310, y: MID_Y })];

// Keyed by the seeder's question_data.word: the picture that rises from the teacup.
export const WORDS = {
  turtle: { emoji: "🐢", label: "Turtle" },
  tiger: { emoji: "🐯", label: "Tiger" },
  tomato: { emoji: "🍅", label: "Tomato" },
  tent: { emoji: "⛺", label: "Tent" },
  tooth: { emoji: "🦷", label: "Tooth" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small t: down, then across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small t. A tall line straight down from the top line, then a short line across on the middle line. Now you try! Start at the green dot."
    : "Watch, then trace small t. Line down, then a short line across.";
}

export function correctSpeech(word: Word): string {
  return `Tea time! t is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small t!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A line down, then a short line across. t is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Terrific! You traced every small t!";

export const DONE_MISSED = "Good try! Keep practicing small t: down, then across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
