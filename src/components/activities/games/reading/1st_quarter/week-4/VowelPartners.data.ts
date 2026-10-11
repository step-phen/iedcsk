import { ordinal } from "@/hooks/useSpeech";

// The five lowercase letters a round can offer as choices. No photo asset for
// this game (like VowelUu, its week-4 sibling) — each tile just shows its
// own big letterform, so no image/emoji is needed here at all.
export const WORDS: Record<string, { name: string }> = {
  a: { name: "small a" },
  e: { name: "small e" },
  i: { name: "small i" },
  o: { name: "small o" },
  u: { name: "small u" },
};

// Everything the game says aloud; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: ["Yes! Great matching.", "You got it!", "That's right!", "Super job!", "Well done!"],
  wrong: ["Not quite!", "Close!", "Almost!", "Good try!"],
};

// The question is asked in three parts: this line, then each choice's name as its card zooms in, then TAP_NOW.
export function questionSpeech(upper: string): string {
  return `Which one is the lowercase partner of ${upper}?`;
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

/** After a right tap: names the pair so the child hears both letters together. */
export function correctSpeech(cheer: string, upper: string, lower: string): string {
  return `${cheer} Big ${upper} and small ${lower} are partners.`;
}

/** After a wrong tap: names the right pair, then moves on (no "next one" on the last question). */
export function correctAnswerSpeech(upper: string, lower: string, isLast: boolean): string {
  const answer = `The partner of big ${upper} is small ${lower}.`;
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
