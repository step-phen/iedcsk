// Letter strokes, m-word pictures and spoken lines for Letter m Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// A short line down from the middle line first, then from partway up a hump over and down, then a second hump over and down.
export const STROKES = [
  straight({ x: 160, y: MID_Y }, { x: 160, y: BASE_Y }),
  chain(arc(205, HUMP_Y, 45, HUMP_Y - MID_Y, Math.PI, 2 * Math.PI, 36), straight({ x: 250, y: HUMP_Y }, { x: 250, y: BASE_Y }, 20)),
  chain(arc(295, HUMP_Y, 45, HUMP_Y - MID_Y, Math.PI, 2 * Math.PI, 36), straight({ x: 340, y: HUMP_Y }, { x: 340, y: BASE_Y }, 20)),
];

// Keyed by the seeder's question_data.word: the picture that pops up when the music box opens.
export const WORDS = {
  moon: { emoji: "🌙", label: "Moon" },
  monkey: { emoji: "🐒", label: "Monkey" },
  mouse: { emoji: "🐭", label: "Mouse" },
  mushroom: { emoji: "🍄", label: "Mushroom" },
  milk: { emoji: "🥛", label: "Milk" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small m: line down, then two humps!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small m. A short line straight down from the middle line, then back up for a hump over and down, and one more hump over and down. Now you try! Start at the green dot."
    : "Watch, then trace small m. Line down, then two humps.";
}

export function correctSpeech(word: Word): string {
  return `La la la! m is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small m!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A short line down, then two humps over and down. m is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Marvelous! You traced every small m!";

export const DONE_MISSED = "Good try! Keep practicing small m: line down, then two humps.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
