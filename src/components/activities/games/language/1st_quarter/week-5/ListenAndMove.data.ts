// Moves and spoken lines for Listen and Move; the arrows are the Week 3 drawings, the greeting and intro stay in lib/speech-lines.ts.

export type Move = "up" | "down" | "left" | "right";

export const MOVES: Move[] = ["up", "down", "left", "right"];

export const OPPOSITE: Record<Move, Move> = { up: "down", down: "up", left: "right", right: "left" };

export const PUPPY = "/images/activities/similarities/asset/dog.webp";

export const INSTRUCTION = "Tap the arrow to send the puppy the opposite way!";

export const WRONG = "Oops, that's the same way, not the opposite!";

export const WRONG_OTHER = "Oops, that's not the opposite way!";

export const DONE_TEXT = "Woof woof! The puppy had so much fun moving with you!";

export function promptSpeech(move: Move): string {
  return `The puppy ran ${move}! Now send it the opposite way.`;
}

export function rightSpeech(move: Move): string {
  return `That's correct! The opposite of ${move} is ${OPPOSITE[move]}!`;
}

/** Said after a miss, as the right arrow lights up and the puppy runs that way. */
export function revealSpeech(move: Move): string {
  return `The opposite of ${move} is ${OPPOSITE[move]}. This way!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
