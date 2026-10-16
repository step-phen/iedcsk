// Letter strokes, G-word pictures and spoken lines for Letter G Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, arc, chain } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

// Where the big C ends on the right, before it comes up a little.
const G_TURN = { x: 260 + 170 * Math.cos(Math.PI / 8), y: MID_Y + 170 * Math.sin(Math.PI / 8) };

// A big C that comes up a little on the right, then a short line in; split in two so a child who lifts before the line in still passes.
export const G_STROKES = [
  chain(arc(260, MID_Y, 170, 170, -Math.PI / 4, (-15 * Math.PI) / 8, 90), straight(G_TURN, { x: G_TURN.x, y: MID_Y }, 12)),
  straight({ x: G_TURN.x, y: MID_Y }, { x: 320, y: MID_Y }),
];

// Keyed by the seeder's question_data.word: the surprise inside the gift box for each G.
export const WORDS = {
  goat: { emoji: "🐐", label: "Goat" },
  grapes: { emoji: "🍇", label: "Grapes" },
  guitar: { emoji: "🎸", label: "Guitar" },
  gorilla: { emoji: "🦍", label: "Gorilla" },
  glasses: { emoji: "👓", label: "Glasses" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big G: big C, up, in!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital G. Make a big C, go up a little, then a short line in. Now you try! Start at the green dot."
    : "Watch, then trace capital G. A big C, up, then in.";
}

export function correctSpeech(word: Word): string {
  return `Surprise! G is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write G!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A big C, up a little, then a short line in. G is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital G!";

export const DONE_MISSED = "Good try! Keep practicing capital G: big C, up, then in.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
