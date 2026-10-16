// Spoken lines and syllable sounds for Listen and Match Syllables: e (vowel first); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "ehm" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  em: "ehm",
  es: "ehs",
  eb: "ehb",
  et: "eht",
  el: "ehl",
};

// One color per spot, so the right egg is never told apart by color.
export const ITEM_COLORS = ["#ffd8a8", "#d0bfff", "#a5d8ff"];

export const INSTRUCTION = "Listen, then tap the egg that says it!";

export const LOADING = "Hiding the eggs…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which egg says ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `You found it! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "You found every egg! You matched every syllable with E!";

export const DONE_MISSED = "Good try! Keep listening for ehm, ehs, ehb, eht and ehl.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} eggs.`;
}
