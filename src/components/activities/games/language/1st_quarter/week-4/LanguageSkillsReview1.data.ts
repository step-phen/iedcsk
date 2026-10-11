// Pictures, task wording and spoken lines for Language Skills Review 1; the shared greeting and intro stay in lib/speech-lines.ts.
// Missing-part and opposite-direction tasks reuse the Week 2 and Week 3 drawings, so only the photo-style pictures are listed here.

import { OBJECTS, PARTS, type ObjectKey, type PartKey } from "../week-2/MissingPartsOfObjects.data";
import { isDirection, type Direction } from "../week-3/OppositeDirections.data";

const SIM = "/images/activities/similarities/asset";
const DIFF = "/images/activities/differences/item";
const TOG = "/images/activities/objects-that-go-together/items";

export type TaskType = "same" | "different" | "together" | "missing" | "opposite" | "letter";

export const TASK_TYPES: TaskType[] = ["same", "different", "together", "missing", "opposite", "letter"];

// Pictures for the same, different and goes-together tasks, keyed by the seeder's ids.
export const PICTURES: Record<string, { name: string; image: string }> = {
  cat: { name: "Cat", image: `${SIM}/cat.webp` },
  dog: { name: "Dog", image: `${SIM}/dog.webp` },
  fish: { name: "Fish", image: `${SIM}/fish.webp` },
  flower: { name: "Flower", image: `${SIM}/flower.webp` },
  star: { name: "Star", image: `${SIM}/star.webp` },
  balloon: { name: "Balloon", image: `${SIM}/balloon.webp` },
  "ball-red": { name: "Red ball", image: `${DIFF}/ball-red.webp` },
  "ball-blue": { name: "Blue ball", image: `${DIFF}/ball-blue.webp` },
  sock: { name: "Sock", image: `${TOG}/sock.svg` },
  shoe: { name: "Shoe", image: `${TOG}/shoe.svg` },
  spoon: { name: "Spoon", image: `${TOG}/spoon.svg` },
  key: { name: "Key", image: `${TOG}/key.svg` },
  lock: { name: "Lock", image: `${TOG}/lock.svg` },
  book: { name: "Book", image: `${TOG}/book.svg` },
  bowl: { name: "Bowl", image: `${TOG}/bowl.svg` },
};

export interface Task {
  type: TaskType;
  target: string | null;
}

export const isLetter = (value: string) => value.length === 1;

/** Whether a seeded choice or target can be drawn for its task type. */
export function drawable(type: TaskType, value: string): boolean {
  if (type === "missing") return value in PARTS;
  if (type === "opposite") return isDirection(value);
  if (type === "letter") return isLetter(value);
  return value in PICTURES;
}

export const isMissingObject = (value: string | null): value is ObjectKey => value !== null && value in OBJECTS;

/** The spoken name of a choice; letters are never named, since that would give the answer away. */
export function choiceName(type: TaskType, value: string): string | null {
  if (type === "letter") return null;
  if (type === "missing") return PARTS[value as PartKey].name;
  if (type === "opposite") return value;
  return PICTURES[value].name;
}

/** What the question pill shows; the letter task is only heard, so the screen never gives it away. */
export function questionText({ type, target }: Task): string {
  switch (type) {
    case "same":
      return "Which one is the same as this?";
    case "different":
      return "Which one is different?";
    case "together":
      return `What goes with the ${target ? PICTURES[target].name.toLowerCase() : "picture"}?`;
    case "missing":
      return `What is missing from the ${isMissingObject(target) ? OBJECTS[target].name.toLowerCase() : "picture"}?`;
    case "opposite":
      return `What is the opposite of ${target as Direction}?`;
    case "letter":
      return "Pop the letter you hear!";
  }
}

export function questionSpeech(task: Task): string {
  if (task.type === "letter" && task.target) {
    return `Find ${task.target === task.target.toUpperCase() ? "big" : "small"} ${task.target}.`;
  }
  return questionText(task);
}

export const RIGHT = "That's correct!";

export const WRONG = "Oops, not that bubble!";

// Said as the right bubble glows after a miss.
export const REVEAL = "This is the right one.";

export const DONE_TEXT = "Pop, pop, hooray! You finished the language review!";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
