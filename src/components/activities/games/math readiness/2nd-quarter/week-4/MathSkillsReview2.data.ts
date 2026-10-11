// Spoken lines for Math Skills Review 2; shapes/colors are drawn with CSS/emoji, the greeting and intro stay in lib/speech-lines.ts.

// Both games share the same 5-color palette (red/blue/green/yellow/purple), so one import covers shapes and baskets alike.
import { COLOR_HEX, SIZE_PX, isShapeName, type Choice, type ShapeName, type SizeName } from "../week-2/ShapeMatching.data";
import { OBJECTS, isColorName, isObjectId } from "./SortByColor.data";

export { COLOR_HEX, SIZE_PX, isShapeName, OBJECTS, isObjectId, isColorName };
export type { Choice, ShapeName, SizeName };

export type Task =
  | { kind: "shape"; shape: ShapeName; reference: { color: string; size: SizeName }; choices: Choice[] }
  | { kind: "pattern"; pattern: ShapeName[]; choices: ShapeName[] }
  | { kind: "color"; object: keyof typeof OBJECTS; bins: string[] };

export const DONE_TEXT = "Review complete! Great thinking!";

export function instruction(task: Task): string {
  switch (task.kind) {
    case "shape":
      return "Tap the shape that matches!";
    case "pattern":
      return "What comes next in the pattern?";
    case "color":
      return "Tap the basket with the same color!";
  }
}

export function promptSpeech(task: Task): string {
  switch (task.kind) {
    case "shape":
      return `Find another ${task.shape}, no matter its color or size!`;
    case "pattern":
      return "Look at the pattern, then tap what comes next!";
    case "color":
      return `Which basket matches the ${OBJECTS[task.object].name.toLowerCase()}?`;
  }
}

export function rightSpeech(task: Task, answer: string): string {
  switch (task.kind) {
    case "shape":
      return `Yes! That is a ${task.shape} too!`;
    case "pattern":
      return `Yes! A ${answer} comes next!`;
    case "color":
      return `Yes! That basket is ${answer}!`;
  }
}

export function revealSpeech(task: Task, answer: string): string {
  switch (task.kind) {
    case "shape":
      return `Here it is! This one is a ${task.shape} as well!`;
    case "pattern":
      return `The pattern continues with a ${answer}!`;
    case "color":
      return `Here it is! This basket is ${answer}!`;
  }
}

export const WRONG = "Oops! Look at this one.";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
