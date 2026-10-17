// Letter stroke, C-word pictures and spoken lines for Letter C Trails; the greeting and intro stay in lib/speech-lines.ts.

import { arc } from "../week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// One curve: from near the top right, up and around to the left, then down and back out to the bottom right.
export const C_STROKES = [arc(270, MID_Y, 155, (BASE_Y - TOP_Y) / 2, -Math.PI / 4, (-7 * Math.PI) / 4, 90)];

// Keyed by the seeder's question_data.word: the picture the canoe brings to the shore.
export const WORDS = {
  cat: { emoji: "🐱", label: "Cat" },
  car: { emoji: "🚗", label: "Car" },
  cake: { emoji: "🎂", label: "Cake" },
  cup: { emoji: "☕", label: "Cup" },
  carrot: { emoji: "🥕", label: "Carrot" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big C: curve around!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital C. Start near the top, curve up and around to the left, then down and stop at the bottom. Now you try! Start at the green dot."
    : "Watch, then trace capital C. Curve around, and stop.";
}

export function correctSpeech(word: Word): string {
  return `Paddle, paddle! The canoe found a ${WORDS[word].label.toLowerCase()}! ${WORDS[word].label} starts with C!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write C!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Start near the top and curve all the way around. ${WORDS[word].label} starts with C.`;
}

export const DONE = "Cool! You traced every capital C!";

export const DONE_MISSED = "Good try! Keep practicing capital C: one big curve around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
