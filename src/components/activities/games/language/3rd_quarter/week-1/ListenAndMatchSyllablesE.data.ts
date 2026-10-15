// Spoken lines and syllable sounds for Listen and Match Syllables: e; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "meh" and not "me" or letter names.
export const SOUNDS: Record<string, string> = {
  me: "meh",
  se: "seh",
  be: "beh",
  te: "teh",
  le: "leh",
};

// One stamp color per spot, so the right envelope is never told apart by color.
export const STAMP_COLORS = ["#ff7eb6", "#5cc8a8", "#ffb84d"];

export const INSTRUCTION = "Listen, then tap the envelope that says it!";

export const LOADING = "Sorting the mail…";

/** Only heard, never shown, so the child has to match the sound to the written syllable. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which envelope says ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Special delivery! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "All the mail is sent! You matched every syllable with the letter E!";

export const DONE_MISSED = "Good try! Keep listening for meh, seh, beh, teh and leh.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You mailed ${score} out of ${total} envelopes.`;
}
