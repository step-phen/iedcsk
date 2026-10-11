// Balloon colours and spoken lines for Say and Point: Ii and Oo; the shared greeting and intro stay in lib/speech-lines.ts.

// One colour per position, so the right balloon is never told apart by colour.
export const BALLOON_COLORS = ["#ff6b6b", "#3d9bff", "#ffc93d", "#3ec27a"];

export const INSTRUCTION = "Listen, then tap the balloon with the letter you hear!";

export const WRONG = "Oops, not that balloon!";

export const DONE_TEXT = "Up, up and away! You know Ii and Oo!";

const letterName = (letter: string) => `${letter === letter.toUpperCase() ? "big" : "small"} ${letter}`;

const sayIt = (letter: string) => `Say it with me: ${letter.toUpperCase()}!`;

/** Only heard, never shown, so the child has to know the letter and its size. */
export function promptSpeech(target: string): string {
  return `Find ${letterName(target)}.`;
}

export function rightSpeech(target: string): string {
  return `That's correct! This is ${letterName(target)}. ${sayIt(target)}`;
}

/** Said after a miss, as the right balloon floats up. */
export function revealSpeech(target: string): string {
  return `This is ${letterName(target)}. ${sayIt(target)}`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
