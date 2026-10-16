// Spoken lines and syllable sounds for Listen and Match Syllables: i; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "mee" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  mi: "mee",
  si: "see",
  bi: "bee",
  ti: "tee",
  li: "lee",
};

// One color per spot, so the right ice cream is never told apart by color.
export const ITEM_COLORS = ["#ffc9de", "#c3fae8", "#fff3bf"];

export const INSTRUCTION = "Listen, then tap the ice cream that says it!";

export const LOADING = "Scooping the ice cream…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which ice cream says ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Yummy! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "You scooped every syllable! You matched every syllable with I!";

export const DONE_MISSED = "Good try! Keep listening for mee, see, bee, tee and lee.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You scooped ${score} out of ${total} ice creams.`;
}
