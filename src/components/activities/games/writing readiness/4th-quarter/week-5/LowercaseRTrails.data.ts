// Letter strokes, r-word pictures and spoken lines for Letter r Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc } from "../../2nd-quarter/week-1/LetterTracePad";

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

// A short line down from the middle line first, then from partway up a little hump over to the right.
export const STROKES = [straight({ x: 220, y: MID_Y }, { x: 220, y: BASE_Y }), arc(260, 210, 40, 40, Math.PI, 1.8 * Math.PI, 30)];

// Keyed by the seeder's question_data.word: the picture waiting at each pit stop the race car reaches.
export const WORDS = {
  rabbit: { emoji: "🐰", label: "Rabbit" },
  ring: { emoji: "💍", label: "Ring" },
  rose: { emoji: "🌹", label: "Rose" },
  rainbow: { emoji: "🌈", label: "Rainbow" },
  robot: { emoji: "🤖", label: "Robot" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small r: line down, then a little hump!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small r. A short line down, then back up for a little hump over. Now you try! Start at the green dot."
    : "Watch, then trace small r. Line down, then a little hump.";
}

export function correctSpeech(word: Word): string {
  return `Vroom! On to the next stop! r is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small r!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A short line down, then a little hump over. r is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "You crossed the finish line! You traced every small r!";

export const DONE_MISSED = "Good race! Keep practicing small r: line down, then a little hump.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
