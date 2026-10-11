// Spoken lines for Show and Say Ee; the shared greeting and intro stay in lib/speech-lines.ts.

export const LETTER = { upper: "E", lower: "e" };

export const INSTRUCTION = "Listen, then tap the egg with the letter you hear!";

export const WRONG = "Oops, that's not it.";

export const DONE_TEXT = "Hooray! All the eggs hatched! You know the letter Ee!";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to know which egg is big E and which is small e. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

// Asks the child to say the name aloud, the "say" half of Show and Say; the game then waits a moment for them.
const SAY_IT = `Say it with me: ${LETTER.upper}!`;

export function rightSpeech(target: string): string {
  return `That's correct! ${caseName(target) === "big" ? "Big" : "Small"} ${target}. ${SAY_IT}`;
}

/** Said after a miss, as the right egg hatches. */
export function revealSpeech(target: string): string {
  return `This is ${caseName(target)} ${target}. ${SAY_IT}`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
