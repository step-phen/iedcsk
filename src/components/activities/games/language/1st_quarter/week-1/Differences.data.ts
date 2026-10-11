import { ordinal } from "@/hooks/useSpeech";

// Game artwork lives in public/images/activities/differences/.
const FOLDER = "/images/activities/differences";

export const ASSETS = {
  background: "/images/background-images/differences-bg.webp",
  title: `${FOLDER}/assets/title.webp`,
  nameBanner: `${FOLDER}/assets/name-banner.webp`,
  starFilled: `${FOLDER}/assets/star-with-fill.webp`,
  starEmpty: `${FOLDER}/assets/star-without-fill.webp`,
};

/** What a round asks the child to compare; the DB stores it as the round's kind. */
export type Kind = "shape" | "fruit" | "color" | "size" | "picture";

export const KINDS: Kind[] = ["shape", "fruit", "color", "size", "picture"];

/** How much smaller the odd one out is drawn in a size round. */
export const SIZE_SCALE = { small: 0.55 } as const;

export type Size = keyof typeof SIZE_SCALE;

/** The DB stores only the object's word ({"base": "circle"}); its picture comes from it here. */
export function itemAsset(object: string): string {
  return `${FOLDER}/item/${object}.webp`;
}

// ponytail: the score art is drawn for 0 to 5; a game with more rounds needs more banner images.
export function scoreBannerAsset(score: number): string {
  return `${FOLDER}/score/score-banner${Math.min(score, 5)}.webp`;
}

/** Spoken name of a picture: "ball-blue" -> "blue ball", and a size word in front for the small one. */
export function itemLabel(object: string, size?: Size): string {
  const [noun, color] = object.split("-");
  return [size, color, noun].filter(Boolean).join(" ");
}

export function instruction(kind: Kind): string {
  return kind === "size" ? "Find the one with a different size." : `Find the ${kind} that is different.`;
}

// Everything the game says aloud; {item} is the different picture and {picked} the one tapped, and the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! The {item} is different!",
    "You found it! The {item} is the odd one.",
    "That's right! It's the {item}!",
    "Sharp eyes! The {item} is different.",
    "Nice spotting! You found the {item}!",
  ],
  // A miss names what was tapped and then the answer, since this is the only moment the child learns which one was different.
  wrong: [
    "Oops! That is the same {picked} as the others. The different one is the {item}.",
    "Good try! That {picked} matches the others. Look, the {item} is different.",
    "Almost! That {picked} is just like the rest. The {item} is the different one.",
  ],
};

/** Praise for a correct pick, naming the picture and the star just earned. */
export function correctSpeech(line: string, item: string): string {
  return `${line.replace("{item}", item)} You get one star!`;
}

/** After a wrong pick: what the child tapped, then the picture that is different. */
export function wrongSpeech(line: string, picked: string, item: string): string {
  return line.replace("{picked}", picked).replace("{item}", item);
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
