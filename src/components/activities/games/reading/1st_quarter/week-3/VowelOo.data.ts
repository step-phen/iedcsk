import { ordinal } from "@/hooks/useSpeech";

// The letter this game practises, as shown and as spoken.
export const LETTER = { shown: "Oo", spoken: "O" };

const ITEMS = "/images/activities/vowel-oo/items";

// Which words a round shows and which one is right comes from activity_questions; these are the pictures for them.
export const WORDS: Record<string, { name: string; image: string }> = {
  octopus: { name: "Octopus", image: `${ITEMS}/octopus.webp` },
  orange: { name: "Orange", image: `${ITEMS}/orange.webp` },
  owl: { name: "Owl", image: `${ITEMS}/owl.webp` },
  onion: { name: "Onion", image: `${ITEMS}/onion.webp` },
  olive: { name: "Olive", image: `${ITEMS}/olive.webp` },
  dog: { name: "Dog", image: `${ITEMS}/dog.webp` },
  ball: { name: "Ball", image: `${ITEMS}/ball.webp` },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp` },
  fish: { name: "Fish", image: `${ITEMS}/fish.webp` },
  car: { name: "Car", image: `${ITEMS}/car.webp` },
  cat: { name: "Cat", image: `${ITEMS}/cat.webp` },
  moon: { name: "Moon", image: `${ITEMS}/moon.webp` },
  hat: { name: "Hat", image: `${ITEMS}/hat.webp` },
};

// Everything the game says aloud; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: ["Yes! Great listening.", "You got it!", "That's right!", "Super job!", "Well done!"],
  wrong: ["Not quite!", "Close!", "Almost!", "Good try!"],
};

// The question is asked in three parts: this line, then each picture's name as its card zooms in, then TAP_NOW.
export function questionSpeech(): string {
  return `Which picture starts with the letter ${LETTER.spoken}?`;
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

/** After a right tap: says the word again so the child hears the vowel sound. */
export function correctSpeech(cheer: string, targetName: string): string {
  return `${cheer} ${targetName} starts with ${LETTER.spoken}.`;
}

/** After a wrong tap: names the right picture, then moves on (no "next one" on the last question). */
export function correctAnswerSpeech(targetName: string, isLast: boolean): string {
  const answer = `This one is ${targetName}. ${targetName} starts with ${LETTER.spoken}.`;
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
