// Letter strokes, e-word pictures and spoken lines for Letter e Trails; the greeting and intro stay in lib/speech-lines.ts.

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

// Across the middle of the letter first, then up and around like a c.
export const STROKES = [chain(straight({ x: 180, y: 235 }, { x: 302, y: 235 }, 24), arc(240, 235, 62, 65, 0, (-7 * Math.PI) / 4, 70))];

// Keyed by the seeder's question_data.word: the picture the spotlight shines on for each e.
export const WORDS = {
  egg: { emoji: "🥚", label: "Egg" },
  eggplant: { emoji: "🍆", label: "Eggplant" },
  eye: { emoji: "👁️", label: "Eye" },
  elbow: { emoji: "💪", label: "Elbow" },
  eight: { emoji: "8️⃣", label: "Eight" },
};

export type Word = keyof typeof WORDS;

export const isWord = (value: unknown): value is Word => typeof value === "string" && value in WORDS;

export const INSTRUCTION = "Watch, then trace small e: across, then around!";

export function promptSpeech(first: boolean): string {
  return first
    ? "Watch the pencil write small e. A little line across the middle, then up and around like a c. Now you try! Start at the green dot."
    : "Watch, then trace small e. Across, then up and around.";
}

export function correctSpeech(word: Word): string {
  return `Spotlight on! e is for ${WORDS[word].label.toLowerCase()}!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write small e!";

export function revealSpeech(word: Word): string {
  return `${REVEAL} A little line across, then up and around. e is for ${WORDS[word].label.toLowerCase()}.`;
}

export const DONE = "Hooray! You traced every small e!";

export const DONE_MISSED = "Good try! Keep practicing small e: across, then around.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} letters correctly.`;
}
