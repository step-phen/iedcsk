// Spoken lines for the Q2 Math Readiness Review/Final Assessment engine; mixes every skill taught this quarter.
// Both games share this file and MathReviewGame2.tsx — only their progress picture and tone differ (see the two wrapper components).

import { COLOR_HEX, SIZE_PX, isShapeName, type Choice, type ShapeName, type SizeName } from "../week-2/ShapeMatching.data";
import { OBJECTS, isColorName, isObjectId } from "../week-4/SortByColor.data";

export { COLOR_HEX, SIZE_PX, isShapeName, OBJECTS, isObjectId, isColorName };
export type { Choice, ShapeName, SizeName };

export type Task =
  | { kind: "shape"; shape: ShapeName; reference: { color: string; size: SizeName }; choices: Choice[] }
  | { kind: "pattern"; pattern: ShapeName[]; choices: ShapeName[] }
  | { kind: "patternGap"; pattern: (ShapeName | null)[]; choices: ShapeName[] }
  | { kind: "color"; object: keyof typeof OBJECTS; bins: string[] }
  | { kind: "namedShape"; shape: ShapeName; choices: ShapeName[] };

export function instruction(task: Task): string {
  switch (task.kind) {
    case "shape":
      return "Tap the shape that matches!";
    case "pattern":
      return "What comes next in the pattern?";
    case "patternGap":
      return "Which piece is missing from the pattern?";
    case "color":
      return "Tap the basket with the same color!";
    case "namedShape":
      return "Which one did you hear?";
  }
}

export function promptSpeech(task: Task): string {
  switch (task.kind) {
    case "shape":
      return `Find another ${task.shape}, no matter its color or size!`;
    case "pattern":
      return "Look at the pattern, then tap what comes next!";
    case "patternGap":
      return "Find the piece that is missing from the pattern!";
    case "color":
      return `Which basket matches the ${OBJECTS[task.object].name.toLowerCase()}?`;
    case "namedShape":
      return `Find the ${task.shape}! Tap the ${task.shape}.`;
  }
}

export function rightSpeech(task: Task, answer: string): string {
  switch (task.kind) {
    case "shape":
      return `Yes! That is a ${task.shape} too!`;
    case "pattern":
      return `Yes! A ${answer} comes next!`;
    case "patternGap":
      return `Yes! A ${answer} was missing there!`;
    case "color":
      return `Yes! That basket is ${answer}!`;
    case "namedShape":
      return `Yes! That is the ${answer}!`;
  }
}

export function revealSpeech(task: Task, answer: string): string {
  switch (task.kind) {
    case "shape":
      return `Here it is! This one is a ${task.shape} as well!`;
    case "pattern":
      return `The pattern continues with a ${answer}!`;
    case "patternGap":
      return `The missing piece is a ${answer}!`;
    case "color":
      return `Here it is! This basket is ${answer}!`;
    case "namedShape":
      return `This one is the ${answer}!`;
  }
}

export const WRONG = "Not quite. Look again!";
