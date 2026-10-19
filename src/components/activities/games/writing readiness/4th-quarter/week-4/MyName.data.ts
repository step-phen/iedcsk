// Rounds and spoken lines for My Name; the letters come from the shared alphabet, and the greeting and intro stay in lib/speech-lines.ts.

import { letterGlyph, type Letter } from "./alphabet";
import type { Glyph, TraceRound } from "./useTraceRounds";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type NameMode = "trace" | "copy";

export const isNameMode = (value: unknown): value is NameMode => value === "trace" || value === "copy";

export const INSTRUCTION: Record<NameMode, string> = {
  trace: "Watch, then trace your name, one letter at a time!",
  copy: "Copy your name from the sign, one letter at a time!",
};

/** One round: the whole name, letter by letter, traced with the pencil's model or copied from the sign. */
export function nameRound(key: string, mode: NameMode, letters: Letter[]): TraceRound {
  const name = letters.map((l) => l.char).join("");
  const glyphs = letters.map(letterGlyph);
  const first = mode === "trace"
    ? `Let's trace your name, ${name}! Watch the pencil write ${glyphs[0].say}.`
    : `Now write your name, ${name}, all by yourself! Look at your name sign. Start with ${glyphs[0].say}.`;
  return {
    key,
    glyphs,
    copy: mode === "copy",
    prompts: glyphs.map((g, i) => (i === 0 ? first : `Now ${g.say}.`)),
    praise: mode === "trace" ? `You traced your name, ${name}! The lights are on!` : `Wow! You wrote your name, ${name}, all by yourself!`,
    missed: "Good try! Let's keep practicing your name.",
  };
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export const revealSpeech = (g: Glyph) => `This is the correct way to write ${g.say}!`;

export const DONE = "Bravo! Your name shines in lights every time!";

export const DONE_MISSED = "Good work! Keep practicing your name, and remember to start with a capital letter.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You wrote your name correctly ${score} out of ${total} times.`;
}
