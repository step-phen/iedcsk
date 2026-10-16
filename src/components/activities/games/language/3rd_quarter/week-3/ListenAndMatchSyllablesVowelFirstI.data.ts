// Spoken lines and syllable sounds for Listen and Match Syllables: i (vowel first); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "eem" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  im: "eem",
  is: "ees",
  ib: "eeb",
  it: "eet",
  il: "eel",
};

// One color per spot, so the right igloo is never told apart by color.
export const ITEM_COLORS = ["#ff6b6b", "#4dabf7", "#51cf66"];

export const INSTRUCTION = "Listen, then tap the igloo that says it!";

export const LOADING = "Building the igloos…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which igloo says ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Brrr-illiant! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Every igloo is warm and cozy! You matched every syllable with I!";

export const DONE_MISSED = "Good try! Keep listening for eem, ees, eeb, eet and eel.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} igloos.`;
}
