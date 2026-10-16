// Spoken lines and syllable sounds for Listen and Match Syllables: u; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "moo" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  mu: "moo",
  su: "soo",
  bu: "boo",
  tu: "too",
  lu: "loo",
};

// One color per spot, so the right leaf is never told apart by color.
export const ITEM_COLORS = ["#8ce99a", "#b2f2bb", "#69db7c"];

export const INSTRUCTION = "Listen, then tap the leaf that says it!";

export const LOADING = "The ladybugs are waking up…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which leaf says ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Hooray! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Every ladybug found its leaf! You matched every syllable with U!";

export const DONE_MISSED = "Good try! Keep listening for moo, soo, boo, too and loo.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} leaves.`;
}
