// Spoken lines and picture layouts for Counting Detective; the pictures and number words are Number Recognition's, the greeting and intro stay in lib/speech-lines.ts.

import { OBJECTS, numberWord, objectName } from "../week-1/NumberRecognition.data";

export { OBJECTS, numberWord, objectName };

export const MAX_COUNT = 10;

export type Layout = "rows" | "scattered";

/** Where a picture sits on the scene, as % of its width and height, with a little tilt when scattered. */
export interface Spot {
  x: number;
  y: number;
  tilt: number;
}

// Ten spots on a jittered 4 by 3 grid, ordered so any first few are spread over the whole scene.
const SCATTER: Spot[] = [
  { x: 12, y: 20, tilt: -12 },
  { x: 60, y: 46, tilt: 8 },
  { x: 88, y: 16, tilt: 14 },
  { x: 35, y: 84, tilt: -6 },
  { x: 40, y: 24, tilt: 10 },
  { x: 85, y: 78, tilt: -14 },
  { x: 16, y: 55, tilt: 6 },
  { x: 62, y: 82, tilt: 12 },
  { x: 90, y: 50, tilt: -8 },
  { x: 64, y: 14, tilt: -4 },
];

/** Rows of five, each row centred; scattered pictures take the spread-out spots. */
export function spots(layout: Layout, count: number): Spot[] {
  if (layout === "scattered") return SCATTER.slice(0, count);
  const rows = Math.ceil(count / 5);
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 5);
    const inRow = Math.min(5, count - row * 5);
    return { x: 50 + (i % 5 - (inRow - 1) / 2) * 19, y: rows === 1 ? 50 : 28 + row * 44, tilt: 0 };
  });
}

/** The order to count aloud after a miss: top to bottom, left to right, like reading. */
export function readingOrder(list: Spot[]): number[] {
  return list.map((_, i) => i).sort((a, b) => Math.floor(list[a].y / 33) - Math.floor(list[b].y / 33) || list[a].x - list[b].x);
}

export const INSTRUCTION = "Tap each one as you count, then tap the number!";

export const DONE_TEXT = "Case solved! You counted every clue!";

export function promptSpeech(object: string): string {
  return `How many ${objectName(object, 2)} are in the picture? Tap each one as you count it, so you count it only once. Then tap the number tag.`;
}

const thereAre = (count: number, object: string) => `There ${count === 1 ? "is" : "are"} ${numberWord(count)} ${objectName(object, count)}`;

export const rightSpeech = (count: number, object: string) => `That's correct! ${thereAre(count, object)}.`;

export const WRONG = "Oops! Let's count them together, one at a time.";

export const revealSpeech = (count: number, object: string) => `${thereAre(count, object)}. Each one counted only once!`;

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
