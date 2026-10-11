// Spoken lines and picture sizes for Find the Smaller Group; the compare lines come from More or Less?, the greeting and intro stay in lib/speech-lines.ts.

import { objectName } from "../week-1/NumberRecognition.data";
import type { Round } from "./TwoGroupsGame";
import type { Side } from "../week-4/MoreOrLess.data";

export const INSTRUCTION = "Tap the group with FEWER!";

export const DONE_TEXT = "Case closed, detective! You found every smaller group!";

export const WRONG = "Oops! Count how many, not how big.";

export function promptSpeech(r: Round): string {
  const careful = r.big ? " Careful! Big pictures do not mean more." : "";
  return `Which group has fewer ${objectName(r.object, 2)}?${careful} Tap it!`;
}

// Three big pictures across for up to six; five small ones across for up to ten.
const BIG = "min(29cqw, 40cqh)";
const SMALL = "min(12cqw, 28cqh)";

/** On a "big" round one side gets big pictures and the other small, so the child compares how many, not how big. */
export function pictureSize(r: Round, side: Side): string | undefined {
  if (!r.big) return undefined;
  return side === r.big && r[side] <= 6 ? BIG : SMALL;
}
