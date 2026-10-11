import { ordinal } from "@/hooks/useSpeech";

export type ShapeKey = "circle" | "square" | "triangle" | "rectangle" | "oval";
export type PieceKey = "wedge" | "corner-triangle" | "corner-square" | "circle" | "square" | "triangle" | "rectangle" | "oval";

const ITEMS = "/images/activities/missing-parts-of-shapes/items";

// Which shape a round shows and which pieces are offered comes from activity_questions; these are the shape names.
export const SHAPES: Record<ShapeKey, { name: string }> = {
  circle: { name: "Circle" },
  square: { name: "Square" },
  triangle: { name: "Triangle" },
  rectangle: { name: "Rectangle" },
  oval: { name: "Oval" },
};

// Each shape's folder holds the shape with its piece cut out, the whole shape, and every piece in that shape's color.
export const shapeImage = (shape: ShapeKey, complete: boolean) => `${ITEMS}/${shape}/${complete ? "whole" : "missing"}.svg`;
export const pieceImage = (shape: ShapeKey, piece: PieceKey) => `${ITEMS}/${shape}/${piece}.svg`;

// Every piece is drawn in the shape's own color, so the child picks by shape, not by color.
export const PIECES: Record<PieceKey, { name: string }> = {
  wedge: { name: "Curved Piece" },
  "corner-triangle": { name: "Triangle Piece" },
  "corner-square": { name: "Square Piece" },
  circle: { name: "Circle" },
  square: { name: "Square" },
  triangle: { name: "Triangle" },
  rectangle: { name: "Rectangle" },
  oval: { name: "Oval" },
};

// Everything the game says aloud; {thing}, {answer} and {picked} are filled in with picture names. The shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! The {answer} completes the {thing}!",
    "Woohoo! You fixed the {thing}!",
    "Amazing! The {thing} is whole again!",
    "Great job! You found the {answer}!",
  ],
  wrong: [
    "Oops! That is the {picked}. The {thing} needs the {answer}.",
    "Good try! That is the {picked}. The {answer} completes the {thing}.",
    "Almost! That one is the {picked}. The {thing} needs the {answer}, see?",
  ],
};

// The question is asked in three parts: this line, then choiceSpeech for each piece's name as its card zooms in, then TAP_NOW.
export function questionSpeech(shapeName: string): string {
  return `Which piece completes the ${shapeName.toLowerCase()}?`;
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
