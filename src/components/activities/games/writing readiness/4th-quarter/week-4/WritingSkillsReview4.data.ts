// Rounds and spoken lines for Writing Skills Review 4: taught small letters, numerals and the child's own name; the greeting and intro stay in lib/speech-lines.ts.

import type { Letter } from "./alphabet";
import { itemGlyphs, itemFace, itemShort, type Item } from "./reviewItems";
import type { Glyph, TraceRound } from "./useTraceRounds";

export { NUMERAL_TOP, NUMERAL_MID, NUMERAL_BASE, isItem, type Item } from "./reviewItems";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export function buildRound(key: string, item: Item, name: Letter[]): TraceRound {
  const glyphs = itemGlyphs(item, name);
  if (item.kind !== "name") {
    return { key, glyphs, copy: false, prompts: [`Watch the pencil write ${glyphs[0].say}. Now you try!`], praise: `Stamped! A perfect ${itemShort(item, glyphs[0])}!`, missed: "" };
  }
  const word = name.map((l) => l.char).join("");
  const first = item.mode === "trace"
    ? `Now let's trace your name, ${word}! Watch the pencil write ${glyphs[0].say}.`
    : `Now write your name, ${word}, all by yourself! Look at the name on the label. Start with ${glyphs[0].say}.`;
  return {
    key,
    glyphs,
    copy: item.mode === "copy",
    prompts: glyphs.map((g, i) => (i === 0 ? first : `Now ${g.say}.`)),
    praise: item.mode === "trace" ? `Stamped! You traced your name, ${word}!` : `Stamped! You wrote your name, ${word}, all by yourself!`,
    missed: "Good try! Let's keep practicing your name.",
  };
}

/** What the stamp shows once its round is done. */
export const stampFace = itemFace;

export function instruction(item: Item): string {
  if (item.kind === "letter") return "Watch, then trace the small letter!";
  if (item.kind === "number") return "Watch, then trace the number!";
  return item.mode === "trace" ? "Trace your name, one letter at a time!" : "Copy your name from the label!";
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export const revealSpeech = (g: Glyph) => `This is the correct way to write ${g.say}!`;

export const DONE = "Wonderful! Every postcard is stamped! You wrote your letters, numbers, and name so well!";

export const DONE_MISSED = "Good work! Keep practicing your letters, numbers, and name, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} stamps.`;
}
