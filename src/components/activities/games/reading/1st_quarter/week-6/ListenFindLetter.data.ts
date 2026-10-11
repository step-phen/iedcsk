// Spoken lines for Listen and Find the Letter; the shared greeting and intro stay in lib/speech-lines.ts.

const ART = "/images/activities/listen-find-letter";

// Both chests share one canvas, so the open one lines up exactly over the closed one.
export const ASSETS = {
  chestClosed: `${ART}/chest-closed.webp`,
  chestOpen: `${ART}/chest-open.webp`,
};

export const INSTRUCTION = "Listen, then tap the treasure chest with the letter you hear!";

export const RIGHT = "That's correct!";

export const WRONG = "Oops, that's not it!";

export const DONE_TEXT = "Hooray! You found all the treasure!";

export function promptSpeech(letter: string): string {
  return `Find the letter ${letter.toUpperCase()}!`;
}

/** After a right pick, or after a miss as the right chest opens. */
export function foundSpeech(letter: string): string {
  return `This is the letter ${letter.toUpperCase()}!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
