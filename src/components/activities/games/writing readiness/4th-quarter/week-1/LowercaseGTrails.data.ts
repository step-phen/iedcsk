// Letter strokes, g-word pictures and spoken lines for Letter g Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// Circle back all the way around first, then a line down past the base line that hooks to the left.
export const STROKES = [
  arc(240, (MID_Y + BASE_Y) / 2, 62, (BASE_Y - MID_Y) / 2, -Math.PI / 4, -Math.PI / 4 - 2 * Math.PI, 80),
  chain(straight({ x: 302, y: MID_Y }, { x: 302, y: 385 }), arc(257, 385, 45, 45, 0, Math.PI * 0.95, 30)),
];

// Keyed by the seeder's question_data.word: the picture inside the gumball that rolls out for each g.
export const WORDS = {
  goat: { emoji: "🐐", label: "Goat" },
  grapes: { emoji: "🍇", label: "Grapes" },
  gift: { emoji: "🎁", label: "Gift" },
  guitar: { emoji: "🎸", label: "Guitar" },
  gorilla: { emoji: "🦍", label: "Gorilla" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small g: around, then down and hook!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small g. Circle back all the way around, then a line down below the base line, and a hook. Now you try! Start at the green dot."
    : "Watch, then trace small g. Circle around, then down and hook.";
}

export function correctSpeech(word: Word): string {
  return `Gumball time! g is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small g!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Circle around, then down and hook. g is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small g!";

export const DONE_MISSED = "Good try! Keep practicing small g: around, then down and hook.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
