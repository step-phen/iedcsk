import { ordinal } from "@/hooks/useSpeech";

export type ItemKey = "pencil" | "book" | "sock" | "shoe" | "key" | "lock" | "spoon" | "bowl" | "toothbrush" | "toothpaste";

const ITEMS_PATH = "/images/activities/objects-that-go-together/items";

// Which object a round shows and which partners are offered comes from activity_questions; these are the pictures for them.
export const ITEMS: Record<ItemKey, { name: string; image: string }> = {
  pencil: { name: "Pencil", image: `${ITEMS_PATH}/pencil.svg` },
  book: { name: "Book", image: `${ITEMS_PATH}/book.svg` },
  sock: { name: "Sock", image: `${ITEMS_PATH}/sock.svg` },
  shoe: { name: "Shoe", image: `${ITEMS_PATH}/shoe.svg` },
  key: { name: "Key", image: `${ITEMS_PATH}/key.svg` },
  lock: { name: "Lock", image: `${ITEMS_PATH}/lock.svg` },
  spoon: { name: "Spoon", image: `${ITEMS_PATH}/spoon.svg` },
  bowl: { name: "Bowl", image: `${ITEMS_PATH}/bowl.svg` },
  toothbrush: { name: "Toothbrush", image: `${ITEMS_PATH}/toothbrush.svg` },
  toothpaste: { name: "Toothpaste", image: `${ITEMS_PATH}/toothpaste.svg` },
};

// Everything the game says aloud; {thing}, {answer} and {picked} are filled in with picture names. The shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! The {thing} goes with the {answer}!",
    "Woohoo! The {thing} and the {answer} go together!",
    "Amazing! You matched the {thing} and the {answer}!",
    "Great job! The {answer} goes with the {thing}!",
  ],
  wrong: [
    "Oops! That is the {picked}. The {thing} goes with the {answer}.",
    "Good try! That is the {picked}. We need the {answer} for the {thing}.",
    "Almost! That one is the {picked}. The {thing} goes with the {answer}, see?",
  ],
};

// The question is asked in three parts: this line, then choiceSpeech for each choice's name as its card zooms in, then TAP_NOW.
export function questionSpeech(itemName: string): string {
  return `What goes with the ${itemName.toLowerCase()}?`;
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
