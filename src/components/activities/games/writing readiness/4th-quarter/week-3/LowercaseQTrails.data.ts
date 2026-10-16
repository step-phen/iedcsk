// Letter strokes, q-word pictures and spoken lines for Letter q Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// Circle back all the way around first, then a line down past the base line with a little kick to the right.
export const STROKES = [
  arc(240, (MID_Y + BASE_Y) / 2, 62, (BASE_Y - MID_Y) / 2, -Math.PI / 4, -Math.PI / 4 - 2 * Math.PI, 80),
  chain(straight({ x: 302, y: MID_Y }, { x: 302, y: 415 }), straight({ x: 302, y: 415 }, { x: 345, y: 385 }, 10)),
];

// Keyed by the seeder's question_data.word: the picture behind each quiz-show tile for each q.
export const WORDS = {
  queen: { emoji: "👸", label: "Queen" },
  question: { emoji: "❓", label: "Question" },
  quilt: { emoji: "🛏️", label: "Quilt" },
  quiet: { emoji: "🤫", label: "Quiet" },
  quail: { emoji: "🐦", label: "Quail" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small q: around, then down and kick!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small q. Circle back all the way around, then a line down below the base line, and a little kick. Now you try! Start at the green dot."
    : "Watch, then trace small q. Circle around, then down and kick.";
}

export function correctSpeech(word: Word): string {
  return `Ding ding! Right answer! q is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small q!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Circle around, then down below the line and a little kick. q is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small q!";

export const DONE_MISSED = "Good try! Keep practicing small q: around, then down and kick.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
