// Zigzag trails, landmarks and spoken lines for Zigzag Adventure; the greeting and intro stay in lib/speech-lines.ts.

import { samplePath, type Point } from "../week-4/TracePad";

export const VIEW_W = 800;
export const VIEW_H = 400;
const START_X = 90;
const END_X = 660;
const LOW_Y = 310;

// Keyed by the seeder's ids: how many peaks each trail climbs, how tall they are, and the landmark it leads to.
export const ITEMS = {
  forest: { peaks: 2, height: 200, landmark: "🌲", name: "the forest" },
  bridge: { peaks: 2, height: 160, landmark: "🌉", name: "the bridge" },
  mountain: { peaks: 3, height: 210, landmark: "🏔️", name: "the mountain" },
  cave: { peaks: 3, height: 170, landmark: "🕳️", name: "the cave" },
  treasure: { peaks: 4, height: 190, landmark: "💰", name: "the treasure" },
};

export type ItemKey = keyof typeof ITEMS;

export const isItem = (value: string): value is ItemKey => value in ITEMS;

/** The corners of a trail: up a slant to a peak, down a slant to a valley, and so on to the right. */
function corners(item: ItemKey): Point[] {
  const { peaks, height } = ITEMS[item];
  const legs = peaks * 2;
  return Array.from({ length: legs + 1 }, (_, i) => ({ x: START_X + ((END_X - START_X) * i) / legs, y: i % 2 ? LOW_Y - height : LOW_Y }));
}

/** The zigzag sampled evenly along its slants, so each turn gets its share of points. */
export function zigzagPath(item: ItemKey): Point[] {
  const pts = corners(item);
  const legs = pts.length - 1;
  return samplePath((t) => {
    const leg = Math.min(Math.floor(t * legs), legs - 1);
    const f = t * legs - leg;
    return { x: pts[leg].x + (pts[leg + 1].x - pts[leg].x) * f, y: pts[leg].y + (pts[leg + 1].y - pts[leg].y) * f };
  }, 24 * legs + 1);
}

export const INSTRUCTION = "Trace the zigzag trail, turn by turn!";

export const DONE_TEXT = "You found the treasure!";

export function promptSpeech(item: ItemKey): string {
  return `Help the explorer reach ${ITEMS[item].name}! Trace the zigzag from the green dot: up, down, up, down, all the way to the star.`;
}

export function rightSpeech(item: ItemKey): string {
  return `That's correct! The explorer made it to ${ITEMS[item].name}!`;
}

export const WRONG = "Oops! Watch the pencil follow every turn.";

export const REVEAL = "Like this! Up, down, up, down.";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
