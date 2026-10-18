// Letter strokes, h-word pictures and spoken lines for Letter h Trails; the greeting and intro stay in lib/speech-lines.ts.

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

const STEM_X = 190;
const HUMP_Y = 210;

// A tall line down from the top line first, then from partway up the line a hump over the middle line and a line down to the base.
export const STROKES = [
  straight({ x: STEM_X, y: TOP_Y }, { x: STEM_X, y: BASE_Y }),
  chain(arc(250, HUMP_Y, 60, HUMP_Y - MID_Y, Math.PI, 2 * Math.PI, 40), straight({ x: 310, y: HUMP_Y }, { x: 310, y: BASE_Y }, 20)),
];

// Keyed by the seeder's question_data.word: the picture hiding under the top hat.
export const WORDS = {
  horse: { emoji: "🐴", label: "Horse" },
  house: { emoji: "🏠", label: "House" },
  hen: { emoji: "🐔", label: "Hen" },
  heart: { emoji: "❤️", label: "Heart" },
  hippo: { emoji: "🦛", label: "Hippo" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small h: tall line, then a hump!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small h. A tall line straight down from the top line, then back up for a hump over and down. Now you try! Start at the green dot."
    : "Watch, then trace small h. Tall line down, then a hump over and down.";
}

export function correctSpeech(word: Word): string {
  return `Hats off! h is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small h!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A tall line down, then a hump over and down. h is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small h!";

export const DONE_MISSED = "Good try! Keep practicing small h: tall line down, then a hump.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
