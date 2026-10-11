// Magnifier spots and spoken lines for Picture Detective; the objects and parts are the Week 2 drawings, the greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, PARTS, type ObjectKey, type PartKey } from "../week-2/MissingPartsOfObjects.data";

// Where each object's missing part sits, in % of the drawing, so the magnifier hovers right over it.
export const MISSING_SPOT: Record<ObjectKey, { x: number; y: number }> = {
  car: { x: 70, y: 76 },
  cup: { x: 82, y: 43 },
  flower: { x: 50, y: 30 },
  umbrella: { x: 47, y: 64 },
  fish: { x: 82, y: 52 },
};

export const INSTRUCTION = "Look closely! Tap the clue with the missing part.";

export const WRONG = "Oops, that's not the missing part!";

export const DONE_TEXT = "Great detective work! You solved every case!";

const objectName = (object: ObjectKey) => OBJECTS[object].name.toLowerCase();

export const partName = (part: PartKey) => PARTS[part].name;

export function promptSpeech(object: ObjectKey): string {
  return `Look at the ${objectName(object)}. What part is missing?`;
}

export function rightSpeech(object: ObjectKey, part: PartKey): string {
  return `That's correct! The ${objectName(object)} needs the ${partName(part).toLowerCase()}. Case solved!`;
}

/** Said after a miss, as the right clue card lights up. */
export function revealSpeech(object: ObjectKey, part: PartKey): string {
  return `The ${objectName(object)} needs the ${partName(part).toLowerCase()}. Case solved!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
