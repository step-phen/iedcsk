// Letter strokes, v-word pictures and spoken lines for Letter v Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// Slant down to the base line first, then slant back up to the middle line (the two may be one stroke).
export const STROKES = [straight({ x: 190, y: MID_Y }, { x: 250, y: BASE_Y }), straight({ x: 250, y: BASE_Y }, { x: 310, y: MID_Y })];

// Keyed by the seeder's question_data.word: the picture that bursts out of each volcano.
export const WORDS = {
  violin: { emoji: "🎻", label: "Violin" },
  van: { emoji: "🚐", label: "Van" },
  vase: { emoji: "🏺", label: "Vase" },
  vest: { emoji: "🦺", label: "Vest" },
  vegetables: { emoji: "🥕", label: "Vegetables" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

const said = (word: Word) => WORDS[word].label.toLowerCase();

export const INSTRUCTION = "Watch, then trace small v: slant down, slant up!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small v. Slant down, then slant up. Now you try! Start at the green dot."
    : "Watch, then trace small v. Slant down, slant up.";
}

export function correctSpeech(word: Word): string {
  return `Boom! The volcano erupts! v is for ${said(word)}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small v!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Slant down, then slant up. v is for ${said(word)}.`;
}

export const DONE = "Hooray! Every volcano erupted! You traced every small v!";

export const DONE_MISSED = "Good try! Keep practicing small v: slant down, slant up.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
