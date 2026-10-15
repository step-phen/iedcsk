// Letter strokes, j-word pictures and spoken lines for Letter j Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain, dot } from "../../2nd-quarter/week-1/LetterTracePad";

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

// A line down past the base line that hooks to the left, then the dot on top.
export const STROKES = [chain(straight({ x: 280, y: MID_Y }, { x: 280, y: 385 }), arc(235, 385, 45, 45, 0, Math.PI * 0.95, 30)), dot(280, 108)];

// Keyed by the seeder's question_data.word: the picture that swings in on a vine for each j.
export const WORDS = {
  juice: { emoji: "🧃", label: "Juice" },
  jeep: { emoji: "🚙", label: "Jeep" },
  jacket: { emoji: "🧥", label: "Jacket" },
  jet: { emoji: "✈️", label: "Jet" },
  jewel: { emoji: "💎", label: "Jewel" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small j: down and hook, then the dot!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small j. A line down below the base line with a hook, then a dot on top. Now you try! Start at the green dot, and don't forget the dot!"
    : "Watch, then trace small j. Down and hook, then the dot.";
}

export function correctSpeech(word: Word): string {
  return `Swinging! j is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small j!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Down and hook, then the dot. j is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small j!";

export const DONE_MISSED = "Good try! Keep practicing small j: down and hook, then the dot.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
