// Letter strokes, c-word pictures and spoken lines for Letter c Trails; the greeting and intro stay in lib/speech-lines.ts.

import { arc } from "../../2nd-quarter/week-1/LetterTracePad";

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

// One curve: start near the top right and circle back around to the bottom.
export const STROKES = [arc(245, 235, 62, 65, -Math.PI / 4, (-7 * Math.PI) / 4, 70)];

// Keyed by the seeder's question_data.word: the picture iced on each cookie for each c.
export const WORDS = {
  cat: { emoji: "🐱", label: "Cat" },
  cake: { emoji: "🎂", label: "Cake" },
  car: { emoji: "🚗", label: "Car" },
  cup: { emoji: "☕", label: "Cup" },
  carrot: { emoji: "🥕", label: "Carrot" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small c: curve back and around!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small c. Start near the top, then curve back and around to the bottom. Now you try! Start at the green dot."
    : "Watch, then trace small c. Curve back and around.";
}

export function correctSpeech(word: Word): string {
  return `Fresh from the oven! c is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small c!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Start near the top, then curve back and around. c is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small c!";

export const DONE_MISSED = "Good try! Keep practicing small c: curve back and around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
