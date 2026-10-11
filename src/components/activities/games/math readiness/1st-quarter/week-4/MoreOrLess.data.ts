// Spoken lines for More or Less?; the pictures and number words are Number Recognition's, the greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, numberWord, objectName } from "../week-1/NumberRecognition.data";

export { OBJECTS, numberWord, objectName };

export type Ask = "more" | "fewer";
export type Side = "left" | "right";

export const SIDES: Side[] = ["left", "right"];

// Small groups only, so each seat shows at most two short rows.
export const MAX_GROUP = 6;

export const DONE_TEXT = "Wheee! The seesaw had so much fun!";

export function instruction(ask: Ask): string {
  return ask === "more" ? "Tap the side with MORE!" : "Tap the side with FEWER!";
}

/** The side holding more or fewer, as asked. */
export function answerSide(left: number, right: number, ask: Ask): Side {
  return (left > right) === (ask === "more") ? "left" : "right";
}

const group = (n: number, object: string) => `${numberWord(n)} ${objectName(object, n)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Four apples are more than two apples." / "One duck is fewer than three ducks." */
export function compareLine(left: number, right: number, object: string, ask: Ask): string {
  const [a, b] = ask === "more" ? [Math.max(left, right), Math.min(left, right)] : [Math.min(left, right), Math.max(left, right)];
  return `${cap(group(a, object))} ${a === 1 ? "is" : "are"} ${ask} than ${group(b, object)}.`;
}

export function promptSpeech(object: string, ask: Ask): string {
  return `Look at both sides. Which side has ${ask} ${objectName(object, 2)}? Tap it!`;
}

export function rightSpeech(left: number, right: number, object: string, ask: Ask): string {
  return `That's correct! ${compareLine(left, right, object, ask)}`;
}

export const WRONG = "Oops! Look at this side.";

/** Said as the right side glows after a miss. */
export function revealSpeech(left: number, right: number, object: string, ask: Ask): string {
  return `This side has ${ask}. ${compareLine(left, right, object, ask)}`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
