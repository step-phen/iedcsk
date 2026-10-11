// Task wording and spoken lines for Language Review, also used by the Language Final Assessment; pictures come from Language Skills Review 1, parts and arrows from Weeks 2 and 3.

import { OBJECTS } from "../week-2/MissingPartsOfObjects.data";
import { isDirection } from "../week-3/OppositeDirections.data";
import {
  PICTURES,
  TASK_TYPES as BASE_TYPES,
  drawable as baseDrawable,
  choiceName as baseChoiceName,
  isLetter,
  isMissingObject,
  type TaskType as BaseType,
} from "../week-4/LanguageSkillsReview1.data";

export { PICTURES, isLetter, isMissingObject };

// "point" is following a spoken direction: tap the arrow pointing the way you hear.
export type TaskType = BaseType | "point";

export const TASK_TYPES: TaskType[] = [...BASE_TYPES, "point"];

export interface Task {
  type: TaskType;
  target: string | null;
}

/** Whether a seeded choice can be drawn for its task type. */
export function drawable(type: TaskType, value: string): boolean {
  return type === "point" ? isDirection(value) : baseDrawable(type, value);
}

/** Whether a task's target fits it: none for "different", otherwise a picture, an object with a missing part, a direction or a letter. */
export function targetOk(type: TaskType, target: unknown): boolean {
  if (type === "different") return target === null;
  if (typeof target !== "string") return false;
  if (type === "missing") return isMissingObject(target);
  if (type === "opposite" || type === "point") return isDirection(target);
  if (type === "letter") return isLetter(target);
  return target in PICTURES;
}

/** The spoken name of a choice; letters are never named, since that would give the answer away. */
export function choiceName(type: TaskType, value: string): string | null {
  return type === "point" ? value : baseChoiceName(type, value);
}

/** What the question pill shows; letter and direction tasks are only heard, so the screen never gives them away. */
export function questionText({ type, target }: Task): string {
  switch (type) {
    case "same":
      return "Which one is the same as this?";
    case "different":
      return "Which one is different?";
    case "together":
      return `What goes with the ${target ? PICTURES[target].name.toLowerCase() : "picture"}?`;
    case "missing":
      return `What is missing from the ${isMissingObject(target) ? OBJECTS[target].name.toLowerCase() : "picture"}?`;
    case "opposite":
      return `What is the opposite of ${target}?`;
    case "point":
      return "Tap the arrow you hear!";
    case "letter":
      return "Tap the letter you hear!";
  }
}

export function questionSpeech(task: Task): string {
  if (task.type === "point") return `Tap the arrow pointing ${task.target}.`;
  if (task.type === "letter" && task.target) {
    return `Find ${task.target === task.target.toUpperCase() ? "big" : "small"} ${task.target}.`;
  }
  return questionText(task);
}

export const RIGHT = "That's correct!";

export const WRONG = "Oops, not that one!";

// Said as the right choice glows after a miss.
export const REVEAL = "This is the right one.";

export const DONE_TEXT = "Blast off! You finished the language review!";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
