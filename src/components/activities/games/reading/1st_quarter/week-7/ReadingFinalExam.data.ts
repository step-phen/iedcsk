// Spoken lines for Reading Final Exam; the answer cards and task wording are shared with Reading Review, the greeting and intro stay in lib/speech-lines.ts.

export const RIGHT = "That's correct! A star for you!";

export const WRONG = "Oops, not that one!";

// Said as the right card lights up after a miss.
export const REVEAL = "This is the right one.";

export const DONE_TEXT = "You lit up the night sky! Great job on your reading exam!";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
