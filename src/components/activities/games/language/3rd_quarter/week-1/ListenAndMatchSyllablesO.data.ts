// Spoken lines and syllable sounds for Listen and Match Syllables: o; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "moh" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  mo: "moh",
  so: "soh",
  bo: "boh",
  to: "toh",
  lo: "loh",
};

// One sail color per spot, so the right boat is never told apart by color.
export const SAIL_COLORS = ["#ffffff", "#ffe39a", "#ffc4c4"];

export const INSTRUCTION = "Listen, then tap the boat that says it!";

export const LOADING = "Getting the boats ready…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which boat says ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Ahoy! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Full speed ahead! You matched every syllable with the letter O!";

export const DONE_MISSED = "Good sailing! Keep listening for moh, soh, boh, toh and loh.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You sailed ${score} out of ${total} boats.`;
}
