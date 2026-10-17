// Letter strokes, n-word pictures and spoken lines for Letter n Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

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

const HUMP_Y = 210;

// A short line down from the middle line first, then from partway up a hump over and down to the base line.
export const STROKES = [
  straight({ x: 210, y: MID_Y }, { x: 210, y: BASE_Y }),
  chain(arc(250, HUMP_Y, 40, HUMP_Y - MID_Y, Math.PI, 2 * Math.PI, 36), straight({ x: 290, y: HUMP_Y }, { x: 290, y: BASE_Y }, 20)),
];

// Keyed by the seeder's question_data.word: the picture that glows in the tree hollow.
export const WORDS = {
  nose: { emoji: "👃", label: "Nose" },
  nut: { emoji: "🥜", label: "Nut" },
  net: { emoji: "🥅", label: "Net" },
  notebook: { emoji: "📓", label: "Notebook" },
  nine: { emoji: "9️⃣", label: "Nine" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small n: line down, then a hump!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small n. A short line straight down from the middle line, then back up for a hump over and down. Now you try! Start at the green dot."
    : "Watch, then trace small n. Line down, then a hump over and down.";
}

export function correctSpeech(word: Word): string {
  return `Hoo hoo! n is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small n!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A short line down, then a hump over and down. n is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Nice work! You traced every small n!";

export const DONE_MISSED = "Good try! Keep practicing small n: line down, then a hump.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
