// Letter strokes, N-word pictures and spoken lines for Letter N Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

const LEFT_X = 120;
const RIGHT_X = 380;

// A line down on the left, then from the top a slant down and a line up; the last two meet, so they may be drawn as one.
export const N_STROKES = [
  straight({ x: LEFT_X, y: TOP_Y }, { x: LEFT_X, y: BASE_Y }),
  straight({ x: LEFT_X, y: TOP_Y }, { x: RIGHT_X, y: BASE_Y }),
  straight({ x: RIGHT_X, y: BASE_Y }, { x: RIGHT_X, y: TOP_Y }),
];

// Keyed by the seeder's question_data.word: the picture printed on the fresh page.
export const WORDS = {
  nose: { emoji: "👃", label: "Nose" },
  nut: { emoji: "🥜", label: "Nut" },
  noodles: { emoji: "🍜", label: "Noodles" },
  nurse: { emoji: "🧑‍⚕️", label: "Nurse" },
  nine: { emoji: "9️⃣", label: "Nine" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big N: down, slant, up!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital N. First, a line down. Go back to the top, slant down, then a line up. Now you try! Start at the green dot."
    : "Watch, then trace capital N. Line down, slant down, line up.";
}

export function correctSpeech(word: Word): string {
  return `Hot off the press! ${WORDS[word].label} starts with N!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write N!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Line down, slant down, then line up. ${WORDS[word].label} starts with N.`;
}

export const DONE = "Nice work! You traced every capital N!";

export const DONE_MISSED = "Good try! Keep practicing capital N: down, slant, up.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
