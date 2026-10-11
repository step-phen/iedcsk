// Objects, layout spots and spoken lines for Count the Objects; the pictures are Number Recognition's, the greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, numberWord, objectAsset, objectName } from "../week-1/NumberRecognition.data";

export { OBJECTS, numberWord, objectAsset, objectName };

export const MAX_COUNT = 10;

// Where each object lies on the picnic blanket before it is counted, as % of the blanket: a loose 5-by-2 scatter.
export const SPOTS = [
  { x: 10, y: 22 },
  { x: 30, y: 12 },
  { x: 50, y: 26 },
  { x: 70, y: 14 },
  { x: 90, y: 24 },
  { x: 12, y: 70 },
  { x: 32, y: 80 },
  { x: 52, y: 66 },
  { x: 71, y: 78 },
  { x: 90, y: 68 },
];

export const COUNT_TEXT = "Tap each one to count it!";

export const PICK_TEXT = "Tap the number that shows how many!";

export const DONE_TEXT = "Great counting! The jars are full!";

export function promptSpeech(object: string): string {
  return `How many ${objectName(object, 2)} are there? Tap each one to count it into the jar!`;
}

export function pickSpeech(object: string): string {
  return `Now tap the number that shows how many ${objectName(object, 2)}.`;
}

export function rightSpeech(object: string, count: number): string {
  return `That's correct! There ${count === 1 ? "is" : "are"} ${numberWord(count)} ${objectName(object, count)}!`;
}

/** Said after a miss, counting the jar again up to the right number as its card lights up. */
export function revealSpeech(object: string, count: number): string {
  const counting = Array.from({ length: count }, (_, i) => numberWord(i + 1)).join(", ");
  return `Oops! Let's count again: ${counting}! There ${count === 1 ? "is" : "are"} ${numberWord(count)} ${objectName(object, count)}.`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
