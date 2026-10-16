// Syllable sounds, bee spots and spoken lines for Listen and Match Syllables: u (vowel first) (Honey Jar); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each syllable is written for the speech voice, so it says "oom" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  um: "oom",
  us: "oos",
  ub: "oob",
  ut: "oot",
  ul: "ool",
};

// Where each bee hovers in the meadow, as left/top inside the play area.
export const BEE_SPOTS = [
  { left: "18%", top: "4%" },
  { left: "50%", top: "20%" },
  { left: "82%", top: "2%" },
];

export const INSTRUCTION = "Listen, then tap the bee that finishes the honey jar word!";

export const LOADING = "The bees are buzzing in…";

/** Only heard, never shown, so the child has to hear the last sound and find the letter that finishes it. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which bee finishes ${SOUNDS[syllable]}?`;
}

const blend = (syllable: string) => `${syllable[0].toUpperCase()} and ${syllable[1].toUpperCase()} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Buzz buzz! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Sweet as honey! You finished every syllable with U!";

export const DONE_MISSED = "Good try! Keep listening for oom, oos, oob, oot and ool.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You filled ${score} out of ${total} honey jars.`;
}
