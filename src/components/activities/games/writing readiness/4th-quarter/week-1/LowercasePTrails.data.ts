// Letter strokes, p-word pictures and spoken lines for Letter p Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// A line down past the base line first, then back up to the middle line for the curve around to the base line.
export const STROKES = [
  straight({ x: 190, y: MID_Y }, { x: 190, y: TAIL_Y }),
  chain(straight({ x: 190, y: MID_Y }, { x: 250, y: MID_Y }, 8), arc(250, (MID_Y + BASE_Y) / 2, 62, (BASE_Y - MID_Y) / 2, -Math.PI / 2, Math.PI / 2, 50), straight({ x: 250, y: BASE_Y }, { x: 190, y: BASE_Y }, 8)),
];

// Keyed by the seeder's question_data.word: the picture printed on the movie ticket for each p.
export const WORDS = {
  penguin: { emoji: "🐧", label: "Penguin" },
  pumpkin: { emoji: "🎃", label: "Pumpkin" },
  popcorn: { emoji: "🍿", label: "Popcorn" },
  parrot: { emoji: "🦜", label: "Parrot" },
  peach: { emoji: "🍑", label: "Peach" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small p: down, then a curve!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small p. A line straight down below the base line, then back up for a curve around. Now you try! Start at the green dot."
    : "Watch, then trace small p. Straight down, then a curve around.";
}

export function correctSpeech(word: Word): string {
  return `Showtime! p is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small p!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Straight down, then a curve around. p is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small p!";

export const DONE_MISSED = "Good try! Keep practicing small p: down, then a curve.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
