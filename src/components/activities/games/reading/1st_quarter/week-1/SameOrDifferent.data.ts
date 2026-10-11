import { ordinal } from "@/hooks/useSpeech";

// Game artwork lives in public/images/activities/similar-and-different/.
const FOLDER = "/images/activities/similar-and-different";

export const ASSETS = {
  background: "/images/activities/similar-and-different/similar-and-different-bg.webp",
  title: `${FOLDER}/background-image/game-title.webp`,
  instruction: `${FOLDER}/background-image/game-instruction.webp`,
  buttons: {
    same: `${FOLDER}/buttons/same-button.webp`,
    different: `${FOLDER}/buttons/different-button.webp`,
  },
  starFilled: `${FOLDER}/stars/star1.webp`,
  starEmpty: `${FOLDER}/stars/star0.webp`,
};

// Words whose picture file is not named after the word itself.
const PICTURE_FILES: Record<string, string> = { balloon: "ballons" };

/** The DB stores only the picture's word ({"a": "apple", "b": "moon"}); its file comes from it here. */
export function pictureAsset(word: string): string {
  return `${FOLDER}/${PICTURE_FILES[word] ?? word}.webp`;
}

/** Spoken and labelled form of a picture's word. */
export function wordLabel(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Everything the game says aloud; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: ["Yes! Great eyes.", "You spotted it!", "That's right!", "Nice looking!", "Sharp eyes!"],
  wrong: ["Not quite!", "Close!", "Almost!", "Good try!"],
};

/** After a wrong tap: names the right answer, then moves on (no "next one" on the last question). */
export function correctAnswerSpeech(round: { labelA: string; labelB: string; same: boolean }, isLast: boolean): string {
  const answer = `The ${round.labelA} and the ${round.labelB} are ${round.same ? "the same" : "different"}.`;
  return isLast ? answer : `${answer} Let's try the next one!`;
}

export function pairSpeech(round: { labelA: string; labelB: string }): string {
  return `Look at the ${round.labelA} and the ${round.labelB}. Are they the same, or different?`;
}

export function firstQuestionSpeech(question: string): string {
  return `The first image is: ${question}`;
}

/** Lead-in for every question after the first, so the next prompt doesn't start abruptly. */
export function nextQuestionSpeech(questionNumber: number, isLast: boolean, question: string): string {
  const transition = isLast
    ? `Okay, for the last and ${ordinal(questionNumber)} image.`
    : `Now let's move to the ${ordinal(questionNumber)} image.`;
  return `${transition} ${question}`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(correct: number, total: number): string {
  if (correct === total) return "Perfect Eyes!";
  return correct >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(correct: number, total: number): string {
  return `${resultHeadline(correct, total)} You got ${correct} out of ${total} correct.`;
}
