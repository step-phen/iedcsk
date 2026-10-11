import { ordinal } from "@/hooks/useSpeech";

// Letters the game can show; which one is asked and which are offered comes from activity_questions.
export const LETTERS = ["A", "a", "B", "b", "O", "o", "S", "s", "M", "m", "T", "t"] as const;
export type Letter = (typeof LETTERS)[number];

export const isLetter = (value: unknown): value is Letter => LETTERS.includes(value as Letter);

// Spoken with the capital letter, so the voice says "ay" and never the word "a".
export const letterName = (letter: Letter) => `${letter === letter.toUpperCase() ? "big" : "small"} ${letter.toUpperCase()}`;

// Everything the game says aloud; {thing}, {answer} and {picked} are filled in with letter names. The shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! {thing} and {answer} are the same letter!",
    "Woohoo! {answer} matches {thing}!",
    "Amazing! You found {answer}!",
    "Great job! {thing} goes with {answer}!",
  ],
  wrong: [
    "Oops! That is {picked}. {thing} goes with {answer}.",
    "Good try! That is {picked}. The match for {thing} is {answer}.",
    "Almost! That one is {picked}. {thing} matches {answer}, see?",
  ],
};

// The question is asked in three parts: this line, then choiceSpeech for each letter as its card zooms in, then TAP_NOW.
export function questionSpeech(prompt: Letter): string {
  return `Which letter is the same as ${letterName(prompt)}?`;
}

/** Names one choice while its card zooms in: "Is it small A?", "big B?", "or big O?". */
export function choiceSpeech(choice: Letter, index: number, count: number): string {
  const name = `${letterName(choice)}?`;
  if (index === 0) return `Is it ${name}`;
  return index === count - 1 ? `or ${name}` : name;
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

// Capitalises the first word, since a line can start with a letter name like "big A".
function fill(line: string, thing: Letter, answer: Letter, picked?: Letter): string {
  const text = line
    .replaceAll("{thing}", letterName(thing))
    .replaceAll("{answer}", letterName(answer))
    .replaceAll("{picked}", picked ? letterName(picked) : "");
  return text.replace(/(^|[.!?] )([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase());
}

/** After a right tap: a cheer that names the pair, plus the star it earned. */
export function correctSpeech(line: string, thing: Letter, answer: Letter): string {
  return `${fill(line, thing, answer)} You get one star!`;
}

/** After a wrong tap: names what was picked and the right answer, then moves on (no "next one" on the last question). */
export function wrongSpeech(line: string, thing: Letter, answer: Letter, picked: Letter, isLast: boolean): string {
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
