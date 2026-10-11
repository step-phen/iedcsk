// Spoken lines for Math Skills Review 1; the pictures and number words are Number Recognition's, the more-or-less lines are More or Less?'s, the greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, numberWord, objectName } from "../week-1/NumberRecognition.data";
import { type Ask, type Side, answerSide, compareLine, promptSpeech as comparePrompt } from "./MoreOrLess.data";

export { OBJECTS, numberWord, objectName, answerSide };
export type { Ask, Side };

// Number recognition covers numerals 1 to 5; counting and matching go up to 10.
export const RECOGNIZE_CHOICES = [1, 2, 3, 4, 5];
export const MAX_COUNT = 10;

export type Task =
  | { kind: "recognize"; number: number }
  | { kind: "count"; object: string; count: number; choices: number[] }
  | { kind: "match"; object: string; number: number; groups: number[] }
  | { kind: "compare"; object: string; left: number; right: number; ask: Ask };

export const DONE_TEXT = "All aboard! The number train is full!";

export function instruction(task: Task): string {
  switch (task.kind) {
    case "recognize":
      return "Tap the number you hear!";
    case "count":
      return "Count, then tap the number!";
    case "match":
      return "Tap the group that matches the number!";
    case "compare":
      return task.ask === "more" ? "Tap the group with MORE!" : "Tap the group with FEWER!";
  }
}

const group = (n: number, object: string) => `${numberWord(n)} ${objectName(object, n)}`;

export function promptSpeech(task: Task): string {
  switch (task.kind) {
    case "recognize":
      return `Find the number ${numberWord(task.number)}! Tap number ${numberWord(task.number)}.`;
    case "count":
      return `How many ${objectName(task.object, 2)} are there? Count them, then tap the number.`;
    case "match":
      return `This is number ${numberWord(task.number)}. Which group has ${group(task.number, task.object)}? Tap it!`;
    case "compare":
      return comparePrompt(task.object, task.ask).replace(/side/g, "group");
  }
}

/** What the right answer shows, said after "That's correct!" or after a miss. */
export function answerLine(task: Task): string {
  switch (task.kind) {
    case "recognize":
      return `This is number ${numberWord(task.number)}.`;
    case "count":
      return `There ${task.count === 1 ? "is" : "are"} ${group(task.count, task.object)}.`;
    case "match":
      return `This group has ${group(task.number, task.object)}.`;
    case "compare":
      return compareLine(task.left, task.right, task.object, task.ask);
  }
}

export const rightSpeech = (task: Task) => `That's correct! ${answerLine(task)}`;

// Counting tasks are counted aloud after a miss; the others just show the answer.
export const WRONG_COUNT = "Oops! Let's count together.";
export const WRONG = "Oops! Look at this one.";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
