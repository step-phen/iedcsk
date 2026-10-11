// Spoken lines for Count and Match; the pictures and number words are Number Recognition's, the greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, numberWord, objectName } from "../week-1/NumberRecognition.data";

export { OBJECTS, numberWord, objectName };

// One lily pad for each number from 1 to 10.
export const PADS = Array.from({ length: 10 }, (_, i) => i + 1);

export const INSTRUCTION = "Count them, then tap the matching lily pad!";

export const DONE_TEXT = "The frog hopped all the way home!";

export function promptSpeech(object: string): string {
  return `How many ${objectName(object, 2)} are in the pond? Count them, then tap the lily pad with that number!`;
}

export function rightSpeech(count: number, object: string): string {
  return `That's correct! ${numberWord(count)} ${objectName(object, count)}. Hop, frog, hop!`;
}

export const WRONG = "Oops! Let's count them together.";

/** Said once the pond has been counted aloud, as the frog hops to the right pad. */
export function revealSpeech(count: number, object: string): string {
  return `There ${count === 1 ? "is" : "are"} ${numberWord(count)} ${objectName(object, count)}. The frog hops to ${numberWord(count)}!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
