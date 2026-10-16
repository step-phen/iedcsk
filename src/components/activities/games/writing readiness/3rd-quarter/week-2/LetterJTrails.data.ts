// Letter strokes, J-word pictures and spoken lines for Letter J Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// A big line down that hooks to the left at the bottom, then a line across the top.
export const J_STROKES = [chain(straight({ x: 310, y: TOP_Y }, { x: 310, y: 330 }, 30), arc(225, 330, 85, BASE_Y - 330, 0, Math.PI, 40)), straight({ x: 220, y: TOP_Y }, { x: 400, y: TOP_Y })];

// Keyed by the seeder's question_data.word: the picture on each glass of juice for each J.
export const WORDS = {
  jeep: { emoji: "🚙", label: "Jeep" },
  jacket: { emoji: "🧥", label: "Jacket" },
  jeans: { emoji: "👖", label: "Jeans" },
  jet: { emoji: "✈️", label: "Jet" },
  juggler: { emoji: "🤹", label: "Juggler" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big J: down, hook, across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital J. A big line down with a hook at the bottom, then a line across the top. Now you try! Start at the green dot."
    : "Watch, then trace capital J. Down and hook, then across the top.";
}

export function correctSpeech(word: Word): string {
  return `Slurp! J is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write J!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big line down with a hook, then across the top. J is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital J!";

export const DONE_MISSED = "Good try! Keep practicing capital J: down and hook, then across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
