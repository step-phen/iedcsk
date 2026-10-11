// Spoken lines for Sort by Shape; the object library is Shape Hunt's, the shared greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, isObjectId, type ShapeName, isShapeName, SHAPE_NAMES } from "../week-1/ShapeHunt.data";

export { OBJECTS, isObjectId, isShapeName, SHAPE_NAMES };
export type { ShapeName };

export const BIN_ORDER: ShapeName[] = ["circle", "square", "triangle", "rectangle"];

export const INSTRUCTION = "Drag every object into the group with its matching shape!";

export const PROMPT = "Drag each object into the group with the matching shape!";

export const TRY_AGAIN = "Not that group. Look at its shape again!";

export function correctSpeech(objectId: keyof typeof OBJECTS): string {
  return `Yes! The ${OBJECTS[objectId].name.toLowerCase()} is a ${SHAPE_NAMES[OBJECTS[objectId].shape]}!`;
}

export function revealSpeech(objectId: keyof typeof OBJECTS): string {
  const shape = OBJECTS[objectId].shape;
  return `Here it is! The ${OBJECTS[objectId].name.toLowerCase()} is a ${SHAPE_NAMES[shape]}!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You sorted ${score} out of ${total} objects.`;
}
