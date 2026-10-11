import { ordinal } from "@/hooks/useSpeech";

const ITEMS_PATH = "/images/activities/odd-one-out/items";

// Each picture: its emoji, its image when the folder has one (shown instead of the emoji), its caption, and how the game says it aloud.
export interface Item {
  emoji: string;
  caption: string;
  say: string;
  image?: string;
}

export const ITEMS = {
  apple: { emoji: "🍎", caption: "Apple", say: "the apple", image: `${ITEMS_PATH}/apple.webp` },
  strawberry: { emoji: "🍓", caption: "Strawberry", say: "the strawberry" },
  cherries: { emoji: "🍒", caption: "Cherries", say: "the cherries" },
  banana: { emoji: "🍌", caption: "Banana", say: "the banana", image: `${ITEMS_PATH}/banana.webp` },
  grapes: { emoji: "🍇", caption: "Grapes", say: "the grapes" },
  ball: { emoji: "⚽", caption: "Ball", say: "the ball", image: `${ITEMS_PATH}/ball.webp` },
  orange: { emoji: "🍊", caption: "Orange", say: "the orange", image: `${ITEMS_PATH}/orange.webp` },
  moon: { emoji: "🌕", caption: "Moon", say: "the moon", image: `${ITEMS_PATH}/moon.webp` },
  box: { emoji: "📦", caption: "Box", say: "the box" },
  elephant: { emoji: "🐘", caption: "Elephant", say: "the elephant", image: `${ITEMS_PATH}/elephant.webp` },
  giraffe: { emoji: "🦒", caption: "Giraffe", say: "the giraffe" },
  whale: { emoji: "🐳", caption: "Whale", say: "the whale" },
  ant: { emoji: "🐜", caption: "Ant", say: "the ant", image: `${ITEMS_PATH}/ant.webp` },
  car: { emoji: "🚗", caption: "Car", say: "the car", image: `${ITEMS_PATH}/car.webp` },
  spoon: { emoji: "🥄", caption: "Spoon", say: "the spoon", image: `${ITEMS_PATH}/spoon.webp` },
  fork: { emoji: "🍴", caption: "Fork", say: "the fork" },
  bowl: { emoji: "🥣", caption: "Bowl", say: "the bowl", image: `${ITEMS_PATH}/bowl.svg` },
  sock: { emoji: "🧦", caption: "Sock", say: "the sock", image: `${ITEMS_PATH}/sock.svg` },
} as const satisfies Record<string, Item>;

export type ItemKey = keyof typeof ITEMS;

export const isItem = (value: unknown): value is ItemKey => typeof value === "string" && value in ITEMS;

// Everything the game says aloud; {answer} and {picked} are filled in with how each picture is said, and {reason} with why the odd one is different (from activity_questions).
export const SPEECH = {
  correct: [
    "Yes! {answer} is the odd one out. {reason}",
    "Woohoo! You found it! {reason}",
    "Amazing! {answer} does not belong. {reason}",
    "Great job! {answer} is different. {reason}",
  ],
  wrong: [
    "Oops! That is {picked}. The odd one out is {answer}. {reason}",
    "Good try! That is {picked}. {answer} is the one that is different. {reason}",
    "Almost! That one is {picked}. Look at {answer}. {reason}",
  ],
};

// The question is asked in three parts: this line, then each picture said aloud as its card zooms in, then TAP_NOW.
export const QUESTION = "Which one is different from the others?";

/** Says one picture while its card zooms in: "Is it the apple?", "the banana?", "or the box?". */
export function choiceSpeech(item: ItemKey, index: number, count: number): string {
  const name = `${ITEMS[item].say}?`;
  if (index === 0) return `Is it ${name}`;
  return index === count - 1 ? `or ${name}` : name;
}

export const TAP_NOW = "Now tap the odd one out!";

export function firstQuestionSpeech(question: string): string {
  return `The first question is: ${question}`;
}

/** Lead-in for every question after the first, so the next prompt doesn't start abruptly. */
export function nextQuestionSpeech(questionNumber: number, isLast: boolean, question: string): string {
  const transition = isLast
    ? `Okay, for the last and ${ordinal(questionNumber)} question.`
    : `Now let's move to the ${ordinal(questionNumber)} question.`;
  return `${transition} ${question}`;
}

// Capitalises the first word of each sentence, since a line can start with a picture's words.
function fill(line: string, answer: ItemKey, reason: string, picked?: ItemKey): string {
  const text = line
    .replaceAll("{answer}", ITEMS[answer].say)
    .replaceAll("{picked}", picked ? ITEMS[picked].say : "")
    .replaceAll("{reason}", reason);
  return text.replace(/(^|[.!?] )([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase());
}

/** After a right tap: a cheer, why the picture is different, and the star it earned. */
export function correctSpeech(line: string, answer: ItemKey, reason: string): string {
  return `${fill(line, answer, reason)} You get one star!`;
}

/** After a wrong tap: names the picked picture, the odd one out and why, then moves on (no "next one" on the last question). */
export function wrongSpeech(line: string, answer: ItemKey, reason: string, picked: ItemKey, isLast: boolean): string {
  const text = fill(line, answer, reason, picked);
  return isLast ? text : `${text} Let's try the next one!`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(correct: number, total: number): string {
  if (correct === total) return "Perfect Score!";
  return correct >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(correct: number, total: number): string {
  return `${resultHeadline(correct, total)} You got ${correct} out of ${total} correct.`;
}
