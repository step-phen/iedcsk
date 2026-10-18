// Letter strokes, f-word pictures and spoken lines for Letter f Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// A curve up over the top line and straight down to the base line first, then a short line across on the middle line.
export const STROKES = [
  chain(arc(290, 100, 40, 40, -0.15 * Math.PI, -Math.PI, 30), straight({ x: 250, y: 100 }, { x: 250, y: BASE_Y })),
  straight({ x: 200, y: MID_Y }, { x: 300, y: MID_Y }),
];

// Keyed by the seeder's question_data.word: the picture parked behind the fire station door.
export const WORDS = {
  fish: { emoji: "🐟", label: "Fish" },
  frog: { emoji: "🐸", label: "Frog" },
  fox: { emoji: "🦊", label: "Fox" },
  flower: { emoji: "🌸", label: "Flower" },
  fork: { emoji: "🍴", label: "Fork" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small f: curve and down, then across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small f. A curve up over the top and straight down, then a short line across on the middle line. Now you try! Start at the green dot."
    : "Watch, then trace small f. Curve over and down, then a short line across.";
}

export function correctSpeech(word: Word): string {
  return `Ding ding! The door opens! f is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small f!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A curve over and down, then a short line across. f is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Fantastic! You traced every small f!";

export const DONE_MISSED = "Good try! Keep practicing small f: curve over and down, then across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
