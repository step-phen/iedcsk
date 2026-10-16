// Letter strokes, S-word pictures and spoken lines for Letter S Trails; the greeting and intro stay in lib/speech-lines.ts.

import { arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// One stroke: a little c curve at the top, then a backwards c curve at the bottom.
export const S_STROKES = [chain(arc(250, 165, 100, 85, -Math.PI / 6, (-3 * Math.PI) / 2, 50), arc(250, 335, 100, 85, -Math.PI / 2, (5 * Math.PI) / 6, 50))];

// Keyed by the seeder's question_data.word: the picture hidden in each seashell for each S.
export const WORDS = {
  sun: { emoji: "☀️", label: "Sun" },
  star: { emoji: "⭐", label: "Star" },
  snake: { emoji: "🐍", label: "Snake" },
  sock: { emoji: "🧦", label: "Sock" },
  sandwich: { emoji: "🥪", label: "Sandwich" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big S: curve back, curve around!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital S. Curve back like a little c, then curve around the other way. Now you try! Start at the green dot."
    : "Watch, then trace capital S. Curve back, then curve around.";
}

export function correctSpeech(word: Word): string {
  return `The shell opens! S is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write S!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Curve back, then curve around the other way. S is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital S!";

export const DONE_MISSED = "Good try! Keep practicing capital S: curve back, then curve around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
