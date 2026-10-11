// Game artwork lives in public/images/activities/number-coloring/.
const FOLDER = "/images/activities/number-coloring";

export const ASSETS = {
  background: "/images/background-images/number-coloring-bg.webp",
  starFilled: `${FOLDER}/star-with-fill.webp`,
  starEmpty: `${FOLDER}/star-without-fill.webp`,
};

/** The DB stores only the object's word ({"object": "apple"}); its picture comes from it here. */
export function objectAsset(object: string): string {
  return `${FOLDER}/objects/${object}.webp`;
}

// Every object with a picture in objects/, and how it is said for one and for more than one.
export const OBJECTS: Record<string, { one: string; many: string }> = {
  apple: { one: "apple", many: "apples" },
  balloon: { one: "balloon", many: "balloons" },
  flower: { one: "flower", many: "flowers" },
  star: { one: "star", many: "stars" },
  sun: { one: "sun", many: "suns" },
};

/** The whole crayon box; the DB names one of these per round ({"color": "blue"}). */
export const CRAYONS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: "yellow", hex: "#FBBF24" },
  { name: "red", hex: "#EF4444" },
  { name: "blue", hex: "#3B82F6" },
  { name: "pink", hex: "#EC4899" },
  { name: "purple", hex: "#A855F7" },
];

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

export function objectName(object: string, count: number): string {
  return count === 1 ? OBJECTS[object].one : OBJECTS[object].many;
}

/** Shown under the title and spoken at the start of each round. */
export function roundPrompt(number: number, object: string, color: string): string {
  return `This is number ${numberWord(number)}. There ${number === 1 ? "is" : "are"} ${numberWord(number)} ${objectName(object, number)}. Color number ${numberWord(number)} ${color}!`;
}

export function shortInstruction(number: number, color: string): string {
  return `Color number ${number} ${color}.`;
}

// Everything the game says after a pick or a finished number; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  rightCrayon: ["Yes! That's {color}!", "Good choice! {color}!", "That's right, {color}!"],
  wrongCrayon: ["Oops! That is {picked}.", "Good try! That one is {picked}.", "Almost! That is {picked}."],
  done: ["Wonderful coloring!", "You did it!", "Beautiful work!", "Great job!", "Look at that color!"],
};

/** After the right crayon: names it, then says what to do with it. */
export function rightCrayonSpeech(line: string, color: string, number: number): string {
  return `${line.replace("{color}", color)} Now color number ${numberWord(number)}.`;
}

/** After a wrong crayon: names the one tapped, then points at the right one, which zooms in on screen. */
export function wrongCrayonSpeech(line: string, picked: string, color: string, number: number): string {
  return `${line.replace("{picked}", picked)} Let's use ${color} for number ${numberWord(number)}.`;
}

export function doneSpeech(line: string, number: number): string {
  return `${line} That is number ${numberWord(number)}.`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You picked the right color for ${score} out of ${total} numbers.`;
}
