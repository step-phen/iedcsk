// Letter strokes, x-word pictures and spoken lines for Letter x Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight } from "../../2nd-quarter/week-1/LetterTracePad";

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

// Slant down from the left first, then slant down from the right to cross it.
export const STROKES = [straight({ x: 195, y: MID_Y }, { x: 305, y: BASE_Y }), straight({ x: 305, y: MID_Y }, { x: 195, y: BASE_Y })];

// Keyed by the seeder's question_data.word: the picture packed in each box the fox tapes shut; most x words end with x.
export const WORDS = {
  fox: { emoji: "🦊", label: "Fox" },
  box: { emoji: "📦", label: "Box" },
  ox: { emoji: "🐂", label: "Ox" },
  six: { emoji: "6️⃣", label: "Six" },
  xray: { emoji: "🩻", label: "X-ray" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

const said = (word: Word) => (word === "xray" ? "x-ray" : WORDS[word].label.toLowerCase());

export const INSTRUCTION = "Watch, then trace small x: slant down, then slant down across!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small x. Slant down one way, then slant down the other way to cross it. Now you try! Start at the green dot."
    : "Watch, then trace small x. Slant down, then slant down across.";
}

export function correctSpeech(word: Word): string {
  return `Taped and ready! You can hear x in ${said(word)}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small x!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Slant down one way, then the other way to cross it. You can hear x in ${said(word)}.`;
}

export const DONE = "All packed! You traced every small x!";

export const DONE_MISSED = "Good try! Keep practicing small x: slant down, then slant down across.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
