// Spoken lines for Match Number to Objects; the pictures and number words are Number Recognition's, the greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, numberWord, objectName } from "../week-1/NumberRecognition.data";

export { OBJECTS, numberWord, objectName };

export const MAX_COUNT = 10;

// The houses' wall colours, left to right.
export const HOUSE_COLORS = ["#ffb4a2", "#a2d2ff", "#bde0a8"];

export const INSTRUCTION = "Deliver the letter to the house with that many!";

export const DONE_TEXT = "Every letter is delivered!";

export function promptSpeech(number: number, object: string): string {
  return `This letter has the number ${numberWord(number)}. Which house has ${numberWord(number)} ${objectName(object, number)}? Tap that house!`;
}

export function rightSpeech(number: number, object: string): string {
  return `That's correct! ${numberWord(number)} ${objectName(object, number)} for number ${numberWord(number)}!`;
}

export const WRONG = "Oops! Not that house. Let's count this one.";

/** Said once the right house has been counted aloud. */
export function revealSpeech(number: number, object: string): string {
  return `This house has ${numberWord(number)} ${objectName(object, number)}. The letter goes here!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
