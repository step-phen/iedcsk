// Letter stroke, O-word pictures and spoken lines for Letter O Trails; the greeting and intro stay in lib/speech-lines.ts.

import { arc } from "../../2nd-quarter/week-1/LetterTracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;

// One stroke: from the top, around to the left, down, and back up to the top.
export const O_STROKES = [arc(250, 250, 145, 170, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI, 90)];

// Keyed by the seeder's question_data.word: the picture that bubbles up inside each traced O.
export const WORDS = {
  octopus: { emoji: "🐙", label: "Octopus" },
  orange: { emoji: "🍊", label: "Orange" },
  owl: { emoji: "🦉", label: "Owl" },
  onion: { emoji: "🧅", label: "Onion" },
  ox: { emoji: "🐂", label: "Ox" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace big O: around and back to the top!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write capital O. Start at the top, go around to the left, down, and back up to the top. Now you try! Start at the green dot."
    : "Watch, then trace capital O. Around to the left and back to the top.";
}

export function correctSpeech(word: Word): string {
  return `Beautiful circle! O is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil go around.";

export const REVEAL = "This is the correct way to write O!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} Start at the top and go around to the left. O is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every capital O!";

export const DONE_MISSED = "Good try! Keep practicing capital O: start at the top and go around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
