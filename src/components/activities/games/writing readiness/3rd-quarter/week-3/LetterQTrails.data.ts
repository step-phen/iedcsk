// Letter strokes, Q-word pictures and spoken lines for Letter Q Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big O all the way around from the top, then a little slant for the tail.
export const Q_STROKES = [arc(250, MID_Y, 145, 170, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 90), straight({ x: 290, y: 340 }, { x: 390, y: 440 })];

// Keyed by the seeder's question_data.word: the royal portrait behind the curtain for each Q.
export const WORDS = {
  queen: { emoji: "👸", label: "Queen" },
  quack: { emoji: "🦆", label: "Quack" },
  question: { emoji: "❓", label: "Question" },
  quiet: { emoji: "🤫", label: "Quiet" },
  quilt: { emoji: "🛏️", label: "Quilt" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big Q: around, then a tail!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital Q. Go all the way around like an O, then add a little slant for the tail. Now you try! Start at the green dot."
    : "Watch, then trace capital Q. All the way around, then the tail.";
}

export function correctSpeech(word: Word): string {
  return `Ta-da! Q is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write Q!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} All the way around, then a little slant for the tail. Q is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital Q!";

export const DONE_MISSED = "Good try! Keep practicing capital Q: around, then the tail.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
