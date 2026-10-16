// Spoken lines and syllable sounds for Listen and Match Syllables: a (vowel first); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "ahm" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  am: "ahm",
  as: "ahs",
  ab: "ahb",
  at: "aht",
  al: "ahl",
};

// One color per spot, so the right airplane is never told apart by color.
export const ITEM_COLORS = ["#e03131", "#1971c2", "#f59f00"];

export const INSTRUCTION = "Listen, then tap the airplane that says it!";

export const LOADING = "Fueling the airplanes…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which airplane says ${SOUNDS[syllable]}?`;
}

// A lone capital "A" is read as the word "uh", so the letter a is spelled the way its name sounds.
const letterName = (letter: string) => (letter === "a" ? "Ay" : letter.toUpperCase());

const blend = (syllable: string) => `${letterName(syllable[0])} and ${letterName(syllable[1])} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Take off! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Every airplane took off! You matched every syllable with A!";

export const DONE_MISSED = "Good try! Keep listening for ahm, ahs, ahb, aht and ahl.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You flew ${score} out of ${total} airplanes.`;
}
