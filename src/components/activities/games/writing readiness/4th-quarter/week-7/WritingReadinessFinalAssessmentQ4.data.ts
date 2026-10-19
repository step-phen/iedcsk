// Rounds and spoken lines for the Quarter 4 Writing Readiness Final Assessment: the child's name, then capital and small letters and numerals, all without a model first; the greeting and intro stay in lib/speech-lines.ts.

import type { Letter } from "../week-4/alphabet";
import { itemGlyphs, itemShort, type Item } from "../week-4/reviewItems";
import type { Glyph, TraceRound } from "../week-4/useTraceRounds";

export { NUMERAL_TOP, NUMERAL_MID, NUMERAL_BASE, isItem, itemFace, type Item } from "../week-4/reviewItems";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// No modeled strokes before the try: the assessment checks the child can form each one alone; the name is copied from the diploma with a faded guide.
export function buildRound(key: string, item: Item, name: Letter[]): TraceRound {
  const glyphs = itemGlyphs(item, name);
  if (item.kind !== "name") {
    return { key, glyphs, copy: false, alone: true, prompts: [`Write ${glyphs[0].say} all by yourself. Start at the green dot.`], praise: `Well done! A gold medal for ${itemShort(item, glyphs[0])}!`, missed: "" };
  }
  const word = name.map((l) => l.char).join("");
  const first = item.mode === "copy"
    ? `Write your name, ${word}, all by yourself! Look at your name on the diploma. Start with ${glyphs[0].say}.`
    : `Trace your name, ${word}, all by yourself! Start with ${glyphs[0].say}.`;
  return {
    key,
    glyphs,
    copy: item.mode === "copy",
    alone: true,
    prompts: glyphs.map((g, i) => (i === 0 ? first : `Now ${g.say}.`)),
    praise: `Well done, ${word}! You wrote your name all by yourself!`,
    missed: "Good try! Keep practicing your name.",
  };
}

export function instruction(item: Item): string {
  if (item.kind === "letter") return item.letter === item.letter.toUpperCase() ? "Write the capital letter all by yourself!" : "Write the small letter all by yourself!";
  if (item.kind === "number") return "Write the number all by yourself!";
  return "Write your name from the diploma, all by yourself!";
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export const revealSpeech = (g: Glyph) => `This is the correct way to write ${g.say}!`;

export const DONE = "Congratulations, graduate! You wrote everything all by yourself!";

export const DONE_MISSED = "Good effort, graduate! Keep practicing your letters, numbers, and name, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You earned ${score} out of ${total} medals.`;
}
