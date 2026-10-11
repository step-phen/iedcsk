import { ordinal } from "@/hooks/useSpeech";

export const ASSETS = {
  background: "/images/background-images/big-and-small-bg.webp",
};

export type Size = "big" | "small";

const ITEMS_PATH = "/images/activities/big-and-small/items";

// Each object the DB can name ({"object": "apple"}): its name and picture; the DB only says which one and whether to tap the big or the small.
export const OBJECTS: Record<string, { name: string; image: string }> = {
  apple: { name: "Apple", image: `${ITEMS_PATH}/apple.webp` },
  ball: { name: "Ball", image: `${ITEMS_PATH}/ball.webp` },
  car: { name: "Car", image: `${ITEMS_PATH}/car.webp` },
  fish: { name: "Fish", image: `${ITEMS_PATH}/fish.webp` },
  "teddy-bear": { name: "Teddy Bear", image: `${ITEMS_PATH}/teddy-bear.webp` },
};

/** The question for a round, e.g. "Which apple is big?". */
export function instructionFor(name: string, askFor: Size): string {
  return `Which ${name.toLowerCase()} is ${askFor}?`;
}

// How wide each picture's box is drawn; the small one is a little over half the big one.
export const PICTURE_BOX: Record<Size, string> = {
  big: "clamp(150px, 32dvh, 260px)",
  small: "clamp(80px, 17dvh, 140px)",
};

// Everything the game says aloud; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: ["Yes! Great eyes.", "You got it!", "That's right!", "Super job!", "Well done!"],
  wrong: ["Not quite!", "Close!", "Almost!", "Good try!"],
};

export function questionSpeech(round: { instruction: string }): string {
  return `${round.instruction} Now tap your answer!`;
}

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

/** After a wrong tap: names the right picture, then moves on (no "next one" on the last question). */
export function correctAnswerSpeech(round: { objectName: string; askFor: Size }, isLast: boolean): string {
  const answer = `This one is the ${round.askFor} ${round.objectName.toLowerCase()}.`;
  return isLast ? answer : `${answer} Let's try the next one!`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(correct: number, total: number): string {
  if (correct === total) return "Perfect Score!";
  return correct >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(correct: number, total: number): string {
  return `${resultHeadline(correct, total)} You got ${correct} out of ${total} correct.`;
}
