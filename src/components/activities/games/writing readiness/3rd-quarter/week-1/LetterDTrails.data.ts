// Letter strokes, D-word pictures and spoken lines for Letter D Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const BASE_Y = 420;

// Straight down first, then back to the top for the big curve around to the bottom.
export const D_STROKES = [
  straight({ x: 150, y: TOP_Y }, { x: 150, y: BASE_Y }),
  chain(straight({ x: 150, y: TOP_Y }, { x: 220, y: TOP_Y }, 8), arc(220, 250, 170, 170, -Math.PI / 2, Math.PI / 2, 70), straight({ x: 220, y: BASE_Y }, { x: 150, y: BASE_Y }, 8)),
];

// Keyed by the seeder's question_data.word: the picture dug out of the sand for each D.
export const WORDS = {
  dog: { emoji: "🐶", label: "Dog" },
  duck: { emoji: "🦆", label: "Duck" },
  drum: { emoji: "🥁", label: "Drum" },
  donut: { emoji: "🍩", label: "Donut" },
  dolphin: { emoji: "🐬", label: "Dolphin" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big D: down, then around!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital D. Straight down, then back to the top and a big curve around to the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital D. Straight down, then a big curve around.";
}

export function correctSpeech(word: Word): string {
  return `You dug it up! D is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write D!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Straight down, then a big curve around. D is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital D!";

export const DONE_MISSED = "Good try! Keep practicing capital D: down, then around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
