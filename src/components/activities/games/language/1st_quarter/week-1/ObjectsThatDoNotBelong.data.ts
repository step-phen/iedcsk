import { ordinal } from "@/hooks/useSpeech";

// This game has no artwork files; its pictures are drawn as SVG in ObjectsThatDoNotBelong.tsx, and these are their colors.
const C = {
  red: "#E8574F", yellow: "#F2C14E", orange: "#F2954E", teal: "#3FB6B0",
  blue: "#5B8EF4", green: "#4CAF7D", purple: "#9B6BDB", pink: "#F2789F",
  brown: "#B08463", gray: "#8FA0C7",
};

/** Fill color of each drawable object; the DB stores only the object's word ({"odd": "car"}). */
export const ITEM_FILL: Record<string, string> = {
  apple: C.red, banana: C.yellow, orange: C.orange, mango: C.orange, watermelon: C.green,
  cat: C.orange, dog: C.brown, fish: C.teal, bird: C.blue, rabbit: C.gray,
  pencil: C.yellow, book: C.blue, eraser: C.pink, ruler: C.blue, crayon: C.red,
  hat: C.purple, shirt: C.teal, shoe: C.brown, socks: C.pink, pants: C.blue,
  ball: C.red, doll: C.pink, teddybear: C.brown, car: C.blue, blocks: C.orange,
};

/** Spoken and labelled name of an object: "teddybear" -> "teddy bear". */
export function itemLabel(object: string): string {
  return object === "teddybear" ? "teddy bear" : object;
}

/** How each round's group of belonging objects is named aloud. */
export const GROUPS: Record<string, string> = {
  fruits: "fruits",
  animals: "animals",
  school: "school things",
  clothes: "clothes",
  toys: "toys",
};

export const INSTRUCTION = "Which one does not belong?";

/** Names the pictures in the order they are shown, so a child who cannot read yet still knows what is on screen. */
export function roundPrompt(labels: string[]): string {
  return `Look at the ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}. ${INSTRUCTION}`;
}

// Everything the game says aloud; {item} is the odd one out, {picked} the one tapped and {group} the others, and the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  correct: [
    "Yes! The {item} does not belong. The others are all {group}!",
    "You got it! The {item} is not one of the {group}.",
    "Great thinking! The {item} does not belong with the {group}.",
    "That's right! The others are {group}, but not the {item}.",
  ],
  // A miss names what was tapped and why it belongs, then the answer, since this is the only moment the child learns which one was odd.
  wrong: [
    "Oops! The {picked} is one of the {group}, so it belongs. The {item} does not belong.",
    "Good try! The {picked} goes with the {group}. Look, the {item} is the one that does not belong.",
    "Almost! The {picked} belongs with the {group}. The {item} is the odd one out.",
  ],
};

function fill(line: string, words: { item: string; group: string; picked?: string }): string {
  return line.replace("{item}", words.item).replace("{group}", words.group).replace("{picked}", words.picked ?? "");
}

/** Praise for a correct pick, naming the odd one, the group, and the star just earned. */
export function correctSpeech(line: string, item: string, group: string): string {
  return `${fill(line, { item, group })} You get one star!`;
}

/** After a wrong pick: what the child tapped and why it belongs, then the odd one out. */
export function wrongSpeech(line: string, picked: string, item: string, group: string): string {
  return fill(line, { item, group, picked });
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
