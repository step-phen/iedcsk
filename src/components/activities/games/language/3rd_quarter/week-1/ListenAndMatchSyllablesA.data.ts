// Spoken lines and syllable sounds for Listen and Match Syllables: a; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "mah" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  ma: "mah",
  sa: "sah",
  ba: "bah",
  ta: "tah",
  la: "lah",
};

export const INSTRUCTION = "Listen, then tap the apple that says it!";

export const LOADING = "Picking the apples…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which apple says ${SOUNDS[syllable]}?`;
}

// A lone capital "A" is read as the word "uh", so the letter a is spelled the way its name sounds.
const letterName = (letter: string) => (letter === "a" ? "Ay" : letter.toUpperCase());

const blend = (syllable: string) => `${letterName(syllable[0])} and ${letterName(syllable[1])} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Yummy! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Your basket is full! You matched every syllable with the letter A!";

export const DONE_MISSED = "Good try! Keep listening for mah, sah, bah, tah and lah.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You picked ${score} out of ${total} apples.`;
}
