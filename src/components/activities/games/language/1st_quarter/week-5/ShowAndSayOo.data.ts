// Owl colours and spoken lines for Show and Say Oo; the shared greeting and intro stay in lib/speech-lines.ts.

export const LETTER = { upper: "O", lower: "o" };

// One sign colour per branch spot, so the right owl is never told apart by colour.
export const SIGN_COLORS = ["#ffd0d0", "#d0e6ff", "#fff0b8", "#d4f5d0"];

export const INSTRUCTION = "Listen, then tap the owl with the letter you hear!";

export const WRONG = "Oops, not that owl!";

export const DONE_TEXT = "Hoo hoo! The owls are so proud of you! You know the letter Oo!";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

const SAY_IT = `Say it with me: ${LETTER.upper}!`;

/** Only heard, never shown, so the child has to know which owl has big O and which has small o. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

export function rightSpeech(target: string): string {
  return `Hoo hoo! That's correct! This is ${caseName(target)} ${target}. ${SAY_IT}`;
}

/** Said after a miss, as the right owl flaps its wings. */
export function revealSpeech(target: string): string {
  return `This is ${caseName(target)} ${target}. ${SAY_IT}`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
