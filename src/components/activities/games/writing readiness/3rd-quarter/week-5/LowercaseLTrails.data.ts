// Letter stroke, l-word pictures and spoken lines for Letter l Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// One tall line straight down from the top line to the base line.
export const STROKES = [straight({ x: 250, y: TOP_Y }, { x: 250, y: BASE_Y })];

// Keyed by the seeder's question_data.word: the picture the lighthouse beam finds on the water.
export const WORDS = {
  lion: { emoji: "🦁", label: "Lion" },
  leaf: { emoji: "🍃", label: "Leaf" },
  lemon: { emoji: "🍋", label: "Lemon" },
  ladybug: { emoji: "🐞", label: "Ladybug" },
  lollipop: { emoji: "🍭", label: "Lollipop" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small l: one tall line down!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small l. Start at the top line and go straight down to the base line. Now you try! Start at the green dot."
    : "Watch, then trace small l. One tall line straight down.";
}

export function correctSpeech(word: Word): string {
  return `Lights on! l is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small l!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} From the top line, straight down to the base line. l is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Lovely! You traced every small l!";

export const DONE_MISSED = "Good try! Keep practicing small l: one tall line, straight down.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
