// Wave shapes and spoken lines for Wave Paths; the greeting and intro stay in lib/speech-lines.ts.

import { samplePath, type Point } from "../week-4/TracePad";

export const VIEW_W = 800;
export const VIEW_H = 400;
export const SEA_Y = 200;
const START_X = 90;
const END_X = 680;

// Keyed by the seeder's ids: how many curves each wave has (over, under, over...) and how tall they are.
export const ITEMS = {
  "wave-1": { humps: 2, height: 110 },
  "wave-2": { humps: 3, height: 105 },
  "wave-3": { humps: 3, height: 85 },
  "wave-4": { humps: 4, height: 95 },
  "wave-5": { humps: 4, height: 80 },
};

export type ItemKey = keyof typeof ITEMS;

export const isItem = (value: string): value is ItemKey => value in ITEMS;

/** A wave from the left: up over the first curve, down under the next, and so on to the right. */
export function wavePath(item: ItemKey): Point[] {
  const { humps, height } = ITEMS[item];
  return samplePath((t) => ({ x: START_X + (END_X - START_X) * t, y: SEA_Y - height * Math.sin(humps * Math.PI * t) }), 30 * humps);
}

export const INSTRUCTION = "Trace the wave so the boat can sail!";

export const DONE_TEXT = "The little boat sailed every wave!";

export function promptSpeech(item: ItemKey): string {
  return `Trace the wave from the green dot to the star. Go up and over, then down and under, ${ITEMS[item].humps > 2 ? "again and again" : "just like the sea"}!`;
}

export const RIGHT = "That's correct! Sail away, little boat!";

export const WRONG = "Oops! Watch the pencil ride the wave.";

export const REVEAL = "Like this! Over and under, over and under.";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
