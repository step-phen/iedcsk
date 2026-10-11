import { ordinal } from "@/hooks/useSpeech";

export type ObjectKey = "car" | "cup" | "flower" | "umbrella" | "fish";
export type PartKey = "wheel" | "cup-handle" | "petal" | "umbrella-handle" | "tail" | "leaf" | "star" | "sock" | "cloud";

// Which object a round shows and which parts are offered comes from activity_questions; this is how each one looks.
export const OBJECTS: Record<ObjectKey, { name: string; fill: string }> = {
  car: { name: "Car", fill: "#5B8EF4" },
  cup: { name: "Cup", fill: "#3FB6B0" },
  flower: { name: "Flower", fill: "#F2789F" },
  umbrella: { name: "Umbrella", fill: "#9B6BDB" },
  fish: { name: "Fish", fill: "#F2954E" },
};

export const PARTS: Record<PartKey, { name: string; fill: string }> = {
  wheel: { name: "Wheel", fill: "#33405f" },
  "cup-handle": { name: "Handle", fill: "#3FB6B0" },
  petal: { name: "Petal", fill: "#F2789F" },
  "umbrella-handle": { name: "Handle", fill: "#4b5876" },
  tail: { name: "Tail", fill: "#F2954E" },
  leaf: { name: "Leaf", fill: "#4CAF7D" },
  star: { name: "Star", fill: "#F2C14E" },
  sock: { name: "Sock", fill: "#F2789F" },
  cloud: { name: "Cloud", fill: "#B7C4DA" },
};

// Everything the game says aloud; {thing}, {answer} and {picked} are filled in with picture names. The shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! The {thing} needs the {answer}!",
    "Woohoo! The {answer} goes on the {thing}!",
    "Amazing! You fixed the {thing}!",
    "Great job! You found the {answer}!",
  ],
  wrong: [
    "Oops! That is the {picked}. The {thing} needs the {answer}.",
    "Good try! That is the {picked}. The {thing} is missing the {answer}.",
    "Almost! That one is the {picked}. The {thing} needs the {answer}, see?",
  ],
};

// The question is asked in three parts: this line, then choiceSpeech for each part's name as its card zooms in, then TAP_NOW.
export function questionSpeech(objectName: string): string {
  return `What part is missing from the ${objectName.toLowerCase()}?`;
}

/** Names one choice while its card zooms in: "Is it the leaf?", "the wheel?", "or the star?". */
export function choiceSpeech(choiceName: string, index: number, count: number): string {
  const the = `the ${choiceName.toLowerCase()}?`;
  if (index === 0) return `Is it ${the}`;
  return index === count - 1 ? `or ${the}` : the;
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

function fill(line: string, thing: string, answer: string, picked = ""): string {
  return line
    .replaceAll("{thing}", thing.toLowerCase())
    .replaceAll("{answer}", answer.toLowerCase())
    .replaceAll("{picked}", picked.toLowerCase());
}

/** After a right tap: a cheer that names the pair, plus the star it earned. */
export function correctSpeech(line: string, thing: string, answer: string): string {
  return `${fill(line, thing, answer)} You get one star!`;
}

/** After a wrong tap: names what was picked and the right answer, then moves on (no "next one" on the last question). */
export function wrongSpeech(line: string, thing: string, answer: string, picked: string, isLast: boolean): string {
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
