// Letter strokes, R-word pictures and spoken lines for Letter R Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big line down, back to the top for a little curve to the middle, then a slant down from where the curve ends.
export const R_STROKES = [
  straight({ x: 160, y: TOP_Y }, { x: 160, y: BASE_Y }),
  chain(straight({ x: 160, y: TOP_Y }, { x: 240, y: TOP_Y }, 8), arc(240, (TOP_Y + MID_Y) / 2, 95, (MID_Y - TOP_Y) / 2, -Math.PI / 2, Math.PI / 2, 50), straight({ x: 240, y: MID_Y }, { x: 160, y: MID_Y }, 8)),
  straight({ x: 160, y: MID_Y }, { x: 350, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture waiting at the rainbow's end for each R.
export const WORDS = {
  rabbit: { emoji: "🐰", label: "Rabbit" },
  robot: { emoji: "🤖", label: "Robot" },
  rocket: { emoji: "🚀", label: "Rocket" },
  ring: { emoji: "💍", label: "Ring" },
  rose: { emoji: "🌹", label: "Rose" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big R: down, curve, slant!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital R. A big line down, then back to the top for a little curve, then a slant down. Now you try! Start at the green dot."
    : "Watch, then trace capital R. Down, a little curve, then a slant.";
}

export function correctSpeech(word: Word): string {
  return `A new rainbow stripe! R is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write R!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big line down, a little curve, then a slant down. R is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital R!";

export const DONE_MISSED = "Good try! Keep practicing capital R: down, curve, then slant.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
