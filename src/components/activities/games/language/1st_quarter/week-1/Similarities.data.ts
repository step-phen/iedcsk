import { ordinal } from "@/hooks/useSpeech";

// Game artwork lives in public/images/activities/similarities/.
const FOLDER = "/images/activities/similarities";

export const ASSETS = {
  background: "/images/background-images/similarities-bg.webp",
  title: `${FOLDER}/title-banner.webp`,
  starFilled: `${FOLDER}/star-with-fill.webp`,
  starEmpty: `${FOLDER}/star-without-fill.webp`,
};

/** The DB stores only the object's word ({"target": "apple"}); its picture comes from it here. */
export function objectAsset(object: string): string {
  return `${FOLDER}/asset/${object}.webp`;
}

// ponytail: the score art is drawn for 0 to 5; a game with more rounds needs more banner images.
export function scoreBannerAsset(score: number): string {
  return `${FOLDER}/score/score-banner${Math.min(score, 5)}.webp`;
}

/** Spoken and labelled form of an object's word. */
export function wordLabel(object: string): string {
  return object.charAt(0).toUpperCase() + object.slice(1);
}

/** "apple" -> "an apple", "banana" -> "a banana". */
function withArticle(object: string): string {
  return `${/^[aeiou]/i.test(object) ? "an" : "a"} ${object.toLowerCase()}`;
}

// Everything the game says aloud; {item} becomes the object with its article, and the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! You found it, that's {item}!",
    "Woohoo! That's {item}!",
    "Amazing! You matched {item}!",
    "Yes! That's a perfect match! You found {item}!",
    "Wow, super eyes! You found {item}!",
    "Hooray! That's the one! {item}!",
    "Yay! Great job! You found {item}!",
  ],
  // A miss names what was tapped ({picked}) and then the answer ({item}), since this is the only moment the child learns which one matched.
  wrong: [
    "Oops! That is {picked}. The one we need to match is {item}.",
    "Good try! That is {picked}. We are looking for {item}.",
    "Almost! That one is {picked}. The match is {item}, see?",
    "Nice try! That is {picked}. The one that matches is {item}.",
  ],
};

/** Praise for a correct pick, naming the object and the star just earned. */
export function correctSpeech(line: string, object: string): string {
  return `${line.replace("{item}", withArticle(object))} You get one star!`;
}

/** After a wrong pick: what the child tapped, then the picture that matches. */
export function wrongSpeech(line: string, picked: string, target: string): string {
  return line.replace("{picked}", withArticle(picked)).replace("{item}", withArticle(target));
}

export function roundPrompt(target: string): string {
  return `Find the picture that is the same as ${withArticle(target)}.`;
}

export function firstRoundSpeech(prompt: string): string {
  return `The first one is: ${prompt}`;
}

/** Lead-in for every round after the first, so the next prompt doesn't start abruptly. */
export function nextRoundSpeech(roundNumber: number, isLast: boolean, prompt: string): string {
  const transition = isLast
    ? `Okay, for the last and ${ordinal(roundNumber)} one.`
    : `Now let's move to the ${ordinal(roundNumber)} one.`;
  return `${transition} ${prompt}`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You got ${score} out of ${total} correct.`;
}
