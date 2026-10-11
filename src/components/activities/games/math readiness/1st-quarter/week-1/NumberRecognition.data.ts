import { ordinal } from "@/hooks/useSpeech";

// Game artwork lives in public/images/activities/number-recognition/.
const FOLDER = "/images/activities/number-recognition";

export const ASSETS = {
  background: "/images/activities/number-recognition/number-recognition-bg.webp",
  title: `${FOLDER}/number-recognation-title-banner.webp`,
};

/** The DB stores only the object's word ({"object": "apple"}); its picture comes from it here. */
export function objectAsset(object: string): string {
  return `${FOLDER}/objects/${object}.webp`;
}

// Every object with a picture in objects/, and how it is said for one and for more than one.
export const OBJECTS: Record<string, { one: string; many: string }> = {
  apple: { one: "apple", many: "apples" },
  star: { one: "star", many: "stars" },
  ball: { one: "ball", many: "balls" },
  fish: { one: "fish", many: "fish" },
  duck: { one: "duck", many: "ducks" },
  banana: { one: "banana", many: "bananas" },
  flower: { one: "flower", many: "flowers" },
  car: { one: "car", many: "cars" },
};

/** The highest number on the buttons for this week's lesson, Recognizing Numbers 1–5. */
export const MAX_CHOICE = 5;

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** "apple" counted 1 -> "apple", counted 3 -> "apples". */
export function objectName(object: string, count: number): string {
  return count === 1 ? OBJECTS[object].one : OBJECTS[object].many;
}

/** "There is one star" / "There are three apples". */
function thereAre(object: string, count: number): string {
  return `There ${count === 1 ? "is" : "are"} ${numberWord(count)} ${objectName(object, count)}`;
}

// Everything the game says after a pick; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: ["Great job!", "Yes! You counted perfectly.", "That's right!", "Super counting!", "You got it!"],
  // A miss names the number tapped ({picked}), since this is the moment the child learns the right count.
  wrong: ["Oops! That is {picked}.", "Good try! That is {picked}.", "Almost! That one is {picked}."],
};

/** Praise for a correct pick, saying the count and the star just earned. */
export function correctSpeech(line: string, object: string, count: number): string {
  return `${line} ${thereAre(object, count)}! You get one star!`;
}

/** After a wrong pick: the number tapped, then one line per number counted, so each object can light up as its number is said, then the right count. */
export function wrongSpeech(line: string, picked: number, object: string, count: number): { lead: string; counting: string[]; closing: string } {
  const word = (n: number) => numberWord(n).charAt(0).toUpperCase() + numberWord(n).slice(1);
  return {
    lead: `${line.replace("{picked}", numberWord(picked))} Let's count together.`,
    counting: Array.from({ length: count }, (_, i) => `${word(i + 1)}.`),
    closing: `${thereAre(object, count)}.`,
  };
}

export function roundPrompt(object: string): string {
  return `How many ${OBJECTS[object].many} do you see? Tap the right number.`;
}

export function firstRoundSpeech(prompt: string): string {
  return `The first question is: ${prompt}`;
}

/** Lead-in for every round after the first, so the next prompt doesn't start abruptly. */
export function nextRoundSpeech(roundNumber: number, isLast: boolean, prompt: string): string {
  const transition = isLast
    ? `Okay, for the last and ${ordinal(roundNumber)} question.`
    : `Now let's move to the ${ordinal(roundNumber)} question.`;
  return `${transition} ${prompt}`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You got ${score} out of ${total} correct.`;
}
