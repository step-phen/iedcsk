// Round things, circle geometry and spoken lines for Circle Trails; the greeting and intro stay in lib/speech-lines.ts.

import { samplePath, type Point } from "../week-4/TracePad";

export const VIEW_W = 800;
export const VIEW_H = 480;
export const CENTER = { x: 400, y: 245 };

// Keyed by the seeder's ids; each is a round thing that appears inside its circle once traced.
export const ITEMS = {
  orange: { name: "orange", r: 165 },
  cookie: { name: "cookie", r: 150 },
  ball: { name: "ball", r: 180 },
  clock: { name: "clock", r: 170 },
  donut: { name: "donut", r: 160 },
};

export type ItemKey = keyof typeof ITEMS;

export const isItem = (value: string): value is ItemKey => value in ITEMS;

/** The circle for a round thing: from the top, around to the left, the bottom, the right, and back to the top. */
export function circlePath(item: ItemKey): Point[] {
  const { r } = ITEMS[item];
  return samplePath((t) => ({ x: CENTER.x - r * Math.sin(2 * Math.PI * t), y: CENTER.y - r * Math.cos(2 * Math.PI * t) }), 90);
}

export const INSTRUCTION = "Trace all the way around the circle!";

export const DONE_TEXT = "You traced every circle!";

export function promptSpeech(item: ItemKey): string {
  return `Something ${ITEMS[item].r >= 170 ? "big and " : ""}round is hiding! Start at the green dot, follow the arrow around the circle, and come back to the dot.`;
}

export function rightSpeech(item: ItemKey): string {
  return `That's correct! It's a round ${ITEMS[item].name}!`;
}

export const WRONG = "Oops! Watch the pencil go all the way around.";

export function revealSpeech(item: ItemKey): string {
  return `Like this! All the way around. It's a round ${ITEMS[item].name}!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
