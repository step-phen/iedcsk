// Tasks and spoken lines shared by the Week 7 math review and final; pictures and number words are Number Recognition's, compare lines are More or Less?'s, scattered spots are Counting Detective's.

import { OBJECTS, numberWord, objectName } from "../week-1/NumberRecognition.data";
import { type Ask, type Side, answerSide, compareLine } from "../week-4/MoreOrLess.data";
import { type Layout, spots, readingOrder } from "../week-6/CountingDetective.data";

export { numberWord, objectName, spots, readingOrder };
export type { Ask, Side, Layout };

// Every numeral, count and group in the quarter stays within 1 to 10.
export const MAX = 10;

export type Task =
  | { kind: "recognize"; number: number; choices: number[] }
  | { kind: "count"; object: string; count: number; choices: number[]; layout: Layout }
  | { kind: "match"; object: string; number: number; groups: number[] }
  | { kind: "compare"; object: string; left: number; right: number; ask: Ask };

const inRange = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX;

/** Choices that hold the answer exactly once, or null. */
function withAnswerOnce(v: unknown, answer: number): number[] | null {
  return Array.isArray(v) && v.length >= 2 && v.every(inRange) && v.filter((n) => n === answer).length === 1 ? (v as number[]) : null;
}

/** Checks one task's data and works out its answer; null when the data is unusable. */
export function parseTask(d: Record<string, unknown>): { task: Task; answer: string } | null {
  const object = typeof d.object === "string" && d.object in OBJECTS ? d.object : null;
  if (d.kind === "recognize" && inRange(d.number)) {
    const choices = withAnswerOnce(d.choices, d.number);
    return choices && { task: { kind: "recognize", number: d.number, choices }, answer: String(d.number) };
  }
  if (d.kind === "count" && object && inRange(d.count) && (d.layout === "rows" || d.layout === "scattered")) {
    const choices = withAnswerOnce(d.choices, d.count);
    return choices && { task: { kind: "count", object, count: d.count, choices, layout: d.layout }, answer: String(d.count) };
  }
  if (d.kind === "match" && object && inRange(d.number)) {
    const groups = withAnswerOnce(d.groups, d.number);
    return groups && { task: { kind: "match", object, number: d.number, groups }, answer: String(d.number) };
  }
  if (d.kind === "compare" && object && inRange(d.left) && inRange(d.right) && d.left !== d.right && (d.ask === "more" || d.ask === "fewer")) {
    return { task: { kind: "compare", object, left: d.left, right: d.right, ask: d.ask }, answer: answerSide(d.left, d.right, d.ask) };
  }
  return null;
}

/** The choices under a task: their values and how many each shows. */
export function choicesOf(task: Task): { value: string; n: number }[] {
  if (task.kind === "compare") {
    return [
      { value: "left", n: task.left },
      { value: "right", n: task.right },
    ];
  }
  const list = task.kind === "match" ? task.groups : task.choices;
  return list.map((n) => ({ value: String(n), n }));
}

export function instruction(task: Task): string {
  switch (task.kind) {
    case "recognize":
      return "Listen, then tap the number!";
    case "count":
      return "Count each one once, then tap the number!";
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
      return `How many ${objectName(task.object, 2)} are there? Count each one once, then tap the number.`;
    case "match":
      return `This is number ${numberWord(task.number)}. Which group has ${group(task.number, task.object)}? Tap it!`;
    case "compare":
      return `Look at both groups. Which group has ${task.ask} ${objectName(task.object, 2)}? Tap it!`;
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

export const WRONG = "Oops! Look at this one.";
export const WRONG_COUNT = "Oops! Let's count together.";
