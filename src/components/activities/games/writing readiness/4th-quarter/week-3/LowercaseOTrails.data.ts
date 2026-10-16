// Letter strokes, o-word pictures and spoken lines for Letter o Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// One curve: start at the top and circle back all the way around.
export const STROKES = [arc(245, (MID_Y + BASE_Y) / 2, 64, (BASE_Y - MID_Y) / 2, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 80)];

// Keyed by the seeder's question_data.word: the picture floating in each bath bubble for each o.
export const WORDS = {
  octopus: { emoji: "🐙", label: "Octopus" },
  owl: { emoji: "🦉", label: "Owl" },
  orange: { emoji: "🍊", label: "Orange" },
  onion: { emoji: "🧅", label: "Onion" },
  otter: { emoji: "🦦", label: "Otter" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small o: all the way around!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small o. Start at the top, then circle back all the way around. Now you try! Start at the green dot."
    : "Watch, then trace small o. Start at the top and circle around.";
}

export function correctSpeech(word: Word): string {
  return `Blub blub, a bubble! o is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small o!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Start at the top and circle all the way around. o is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small o!";

export const DONE_MISSED = "Good try! Keep practicing small o: all the way around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
