// Letter strokes, E-word pictures and spoken lines for Letter E Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big line down, then little lines across the top, the middle and the bottom.
export const E_STROKES = [
  straight({ x: 160, y: TOP_Y }, { x: 160, y: BASE_Y }),
  straight({ x: 160, y: TOP_Y }, { x: 345, y: TOP_Y }),
  straight({ x: 160, y: MID_Y }, { x: 315, y: MID_Y }),
  straight({ x: 160, y: BASE_Y }, { x: 345, y: BASE_Y }),
];

// Keyed by the seeder's question_data.word: the picture that hatches from a nest egg for each E.
export const WORDS = {
  elephant: { emoji: "🐘", label: "Elephant" },
  eagle: { emoji: "🦅", label: "Eagle" },
  ear: { emoji: "👂", label: "Ear" },
  earth: { emoji: "🌍", label: "Earth" },
  envelope: { emoji: "✉️", label: "Envelope" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big E: down, top, middle, bottom!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital E. A big line down, then little lines across the top, the middle, and the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital E. Down, then across the top, the middle, and the bottom.";
}

export function correctSpeech(word: Word): string {
  return `Crack! It hatched! E is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write E!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big line down, then across the top, the middle, and the bottom. E is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital E!";

export const DONE_MISSED = "Good try! Keep practicing capital E: down, then top, middle, bottom.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
