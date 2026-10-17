// Letter strokes, A-word pictures and spoken lines for Letter A Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

const PEAK = { x: 250, y: TOP_Y };

// Both slants start at the peak; the line across sits on the middle line, halfway down each slant.
export const A_STROKES = [
  straight(PEAK, { x: 110, y: BASE_Y }),
  straight(PEAK, { x: 390, y: BASE_Y }),
  straight({ x: 180, y: MID_Y }, { x: 320, y: MID_Y }),
];

// Keyed by the seeder's question_data.word: the picture found on the planet the rocket reaches.
export const WORDS = {
  apple: { emoji: "🍎", label: "Apple" },
  ant: { emoji: "🐜", label: "Ant" },
  airplane: { emoji: "✈️", label: "Airplane" },
  alligator: { emoji: "🐊", label: "Alligator" },
  anchor: { emoji: "⚓", label: "Anchor" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big A: slant, slant, across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital A. Start at the top and slant down to the left. Go back to the top and slant down to the right. Then a line across the middle. Now you try! Start at the green dot."
    : "Watch, then trace capital A. Slant down, slant down, line across.";
}

export function correctSpeech(word: Word): string {
  return `Three, two, one, blast off! ${WORDS[word].label} starts with A!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write A!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Slant down, slant down, then a line across the middle. ${WORDS[word].label} starts with A.`;
}

export const DONE = "Amazing! You traced every capital A!";

export const DONE_MISSED = "Good try! Keep practicing capital A: slant, slant, across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
