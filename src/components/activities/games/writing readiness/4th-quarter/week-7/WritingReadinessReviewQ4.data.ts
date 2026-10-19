// Rounds and spoken lines for the Quarter 4 Writing Readiness Review: capital and small letters, numerals and the child's name, each modeled first; the greeting and intro stay in lib/speech-lines.ts.

import type { Letter } from "../week-4/alphabet";
import { itemGlyphs, itemShort, type Item } from "../week-4/reviewItems";
import type { Glyph, TraceRound } from "../week-4/useTraceRounds";

export { NUMERAL_TOP, NUMERAL_MID, NUMERAL_BASE, isItem, itemFace, type Item } from "../week-4/reviewItems";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export function buildRound(key: string, item: Item, name: Letter[]): TraceRound {
  const glyphs = itemGlyphs(item, name);
  if (item.kind !== "name") {
    return { key, glyphs, copy: false, prompts: [`Watch the pencil write ${glyphs[0].say}. Now you try!`], praise: `Hang it on the wall! A beautiful ${itemShort(item, glyphs[0])}!`, missed: "" };
  }
  const word = name.map((l) => l.char).join("");
  return {
    key,
    glyphs,
    // Every review item is modeled first, so a name item never skips the pencil, whatever its mode.
    copy: false,
    prompts: glyphs.map((g, i) => (i === 0 ? `Now let's trace your name, ${word}! Watch the pencil write ${g.say}.` : `Now ${g.say}.`)),
    praise: `Hang it on the wall! You traced your name, ${word}!`,
    missed: "Good try! Let's keep practicing your name.",
  };
}

export function instruction(item: Item): string {
  if (item.kind === "letter") return item.letter === item.letter.toUpperCase() ? "Watch, then trace the capital letter!" : "Watch, then trace the small letter!";
  if (item.kind === "number") return "Watch, then trace the number!";
  return "Watch, then trace your name, one letter at a time!";
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export const revealSpeech = (g: Glyph) => `This is the correct way to write ${g.say}!`;

export const DONE = "Bravo! The gallery is full of your beautiful writing!";

export const DONE_MISSED = "Good work! Keep practicing your letters, numbers, and name, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You hung ${score} out of ${total} pictures.`;
}
