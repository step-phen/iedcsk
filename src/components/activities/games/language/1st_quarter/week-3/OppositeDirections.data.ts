import { ordinal } from "@/hooks/useSpeech";

// Directions the game can show; which one is asked and which are offered comes from activity_questions.
export const DIRECTIONS = ["up", "down", "left", "right", "top", "bottom"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const isDirection = (value: unknown): value is Direction => DIRECTIONS.includes(value as Direction);

// Everything the game says aloud; {thing}, {answer} and {picked} are filled in with direction words. The shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! The opposite of {thing} is {answer}!",
    "Woohoo! {thing} and {answer} are opposites!",
    "Amazing! You found {answer}!",
    "Great job! {answer} goes the other way from {thing}!",
  ],
  wrong: [
    "Oops! That is {picked}. The opposite of {thing} is {answer}.",
    "Good try! That is {picked}. {thing} and {answer} are opposites.",
    "Almost! That one is {picked}. The opposite of {thing} is {answer}, see?",
  ],
};

// The question is asked in three parts: this line, then choiceSpeech for each direction as its card zooms in, then TAP_NOW.
export function questionSpeech(prompt: Direction): string {
  return `What is the opposite of ${prompt}?`;
}

/** Names one choice while its card zooms in: "Is it down?", "left?", "or right?". */
export function choiceSpeech(choice: Direction, index: number, count: number): string {
  if (index === 0) return `Is it ${choice}?`;
  return index === count - 1 ? `or ${choice}?` : `${choice}?`;
}

export const TAP_NOW = "Now tap your answer!";

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

// Capitalises the first word of each sentence, since a line can start with a direction word.
function fill(line: string, thing: Direction, answer: Direction, picked?: Direction): string {
  const text = line
    .replaceAll("{thing}", thing)
    .replaceAll("{answer}", answer)
    .replaceAll("{picked}", picked ?? "");
  return text.replace(/(^|[.!?] )([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase());
}

/** After a right tap: a cheer that names the pair, plus the star it earned. */
export function correctSpeech(line: string, thing: Direction, answer: Direction): string {
  return `${fill(line, thing, answer)} You get one star!`;
}

/** After a wrong tap: names what was picked and the right answer, then moves on (no "next one" on the last question). */
export function wrongSpeech(line: string, thing: Direction, answer: Direction, picked: Direction, isLast: boolean): string {
  const text = fill(line, thing, answer, picked);
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
