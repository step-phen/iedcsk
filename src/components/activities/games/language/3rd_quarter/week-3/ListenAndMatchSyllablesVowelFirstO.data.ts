// Spoken lines and syllable sounds for Listen and Match Syllables: o (vowel first); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "ohm" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  om: "ohm",
  os: "ohs",
  ob: "ohb",
  ot: "oht",
  ol: "ohl",
};

// One color per spot, so the right owl is never told apart by color.
export const ITEM_COLORS = ["#a0522d", "#868e96", "#cc8a4c"];

export const INSTRUCTION = "Listen, then tap the owl that says it!";

export const LOADING = "The owls are waking up…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which owl says ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Hoo hoo! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Every owl hooted its syllable! You matched every syllable with O!";

export const DONE_MISSED = "Good try! Keep listening for ohm, ohs, ohb, oht and ohl.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You hooted with ${score} out of ${total} owls.`;
}
