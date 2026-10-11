import { ordinal } from "@/hooks/useSpeech";

// Game artwork lives in public/images/activities/long-and-short/.
const FOLDER = "/images/activities/long-and-short";

export const ASSETS = {
  background: "/images/background-images/long-short-jungle-bg.webp",
  title: `${FOLDER}/title-banner.webp`,
};

export type Length = "long" | "short";

// ponytail: the badge art is drawn for 0 to 5 out of 5; a game with more rounds needs more score images.
export function scoreBadgeAsset(correct: number): string {
  return `${FOLDER}/score-badge/score${Math.min(correct, 5)}.webp`;
}

/** The DB stores only the object's word ({"object": "snake"}); its long and short pictures come from it here. */
export function pictureAsset(object: string, length: Length): string {
  return `${FOLDER}/items/${length}-${object}.webp`;
}

/** Spoken and labelled form of an object's word. */
export function wordLabel(object: string): string {
  return object.charAt(0).toUpperCase() + object.slice(1);
}

// How long each picture is drawn; the short one is shown at its share of the long one's width.
const LENGTHS: Record<string, Record<Length, number>> = {
  snake: { long: 176, short: 70 },
  pencil: { long: 150, short: 60 },
  ribbon: { long: 190, short: 80 },
  worm: { long: 140, short: 55 },
  scarf: { long: 165, short: 65 },
};

/** Width of a picture as a share (0..1) of the longest picture in the game. */
export function pictureWidth(object: string, length: Length): number {
  const longest = Math.max(...Object.values(LENGTHS).map((l) => l.long));
  return (LENGTHS[object]?.[length] ?? (length === "long" ? longest : longest / 2)) / longest;
}

// Everything the game says aloud; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: ["Yes! Great eyes.", "You got it!", "Nice measuring!", "That's right!", "Super job!"],
  wrong: ["Not quite!", "Close!", "Almost!", "Good try!"],
};

export function questionSpeech(round: { label: string; askFor: "longer" | "shorter" }): string {
  return `Tap the ${round.askFor} ${round.label}. Now tap your answer!`;
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
export function correctAnswerSpeech(round: { label: string; askFor: "longer" | "shorter" }, isLast: boolean): string {
  const answer = `The ${round.askFor === "longer" ? "long" : "short"} ${round.label.toLowerCase()} is the ${round.askFor} one.`;
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
