// Letter strokes, V-word pictures and spoken lines for Letter V Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big slant down to the bottom point, then a big slant back up; the two meet at the point, so one unlifted stroke also counts.
export const V_STROKES = [straight({ x: 130, y: TOP_Y }, { x: 250, y: BASE_Y }), straight({ x: 250, y: BASE_Y }, { x: 370, y: TOP_Y })];

// Keyed by the seeder's question_data.word: the picture a hot-air balloon carries up for each V.
export const WORDS = {
  violin: { emoji: "🎻", label: "Violin" },
  van: { emoji: "🚐", label: "Van" },
  vase: { emoji: "🏺", label: "Vase" },
  volcano: { emoji: "🌋", label: "Volcano" },
  volleyball: { emoji: "🏐", label: "Volleyball" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big V: slant down, slant up!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital V. A big slant down to the point, then a big slant back up. Now you try! Start at the green dot."
    : "Watch, then trace capital V. Slant down, then slant up.";
}

export function correctSpeech(word: Word): string {
  return `Up, up and away! V is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write V!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big slant down, then a big slant up. V is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital V!";

export const DONE_MISSED = "Good try! Keep practicing capital V: slant down, then slant up.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
