// Letter strokes, y- and z-word pictures and spoken lines for Letter y and z Trails; the greeting and intro stay in lib/speech-lines.ts.

import { straight, chain } from "../../2nd-quarter/week-1/LetterTracePad";
import type { Glyph, TraceRound } from "../week-4/useTraceRounds";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW = 500;
// The four writing lines a small letter uses: top, dashed middle, base, and the tail line below the base.
export const TOP_Y = 60;
export const MID_Y = 170;
export const BASE_Y = 300;
export const TAIL_Y = 430;

// A short slant down to meet the long line first, then a long slant down past the base line.
export const Y_STROKES = [straight({ x: 205, y: MID_Y }, { x: 276, y: 240 }), straight({ x: 300, y: MID_Y }, { x: 210, y: TAIL_Y })];

// One stroke: across the middle line, slant down to the left, then across the base line.
export const Z_STROKES = [chain(straight({ x: 195, y: MID_Y }, { x: 305, y: MID_Y }), straight({ x: 305, y: MID_Y }, { x: 195, y: BASE_Y }), straight({ x: 195, y: BASE_Y }, { x: 305, y: BASE_Y }))];

const Y_CUE = "A short slant down, then a long slant down past the line.";
const Z_CUE = "Across, slant down, then across.";

const glyph = (char: "y" | "z"): Glyph => ({ say: `small ${char}`, strokes: char === "y" ? Y_STROKES : Z_STROKES, viewW: VIEW, viewH: VIEW, lines: "small" });

// Keyed by the seeder's question_data.y and .z: the two pictures knitted into each stripe of the scarf.
export const Y_WORDS = {
  yoyo: { emoji: "🪀", label: "Yo-yo" },
  yarn: { emoji: "🧶", label: "Yarn" },
  yawn: { emoji: "🥱", label: "Yawn" },
  yacht: { emoji: "🛥️", label: "Yacht" },
  yellow: { emoji: "💛", label: "Yellow" },
};

export const Z_WORDS = {
  zebra: { emoji: "🦓", label: "Zebra" },
  zero: { emoji: "0️⃣", label: "Zero" },
  zipper: { emoji: "🤐", label: "Zipper" },
  zucchini: { emoji: "🥒", label: "Zucchini" },
  zigzag: { emoji: "⚡", label: "Zigzag" },
};

export type YWord = keyof typeof Y_WORDS;
export type ZWord = keyof typeof Z_WORDS;

export function isPair(value: unknown): value is { y: YWord; z: ZWord } {
  const v = (value ?? {}) as Record<string, unknown>;
  return typeof v.y === "string" && v.y in Y_WORDS && typeof v.z === "string" && v.z in Z_WORDS;
}

/** One stripe: small y, then small z, each modeled by the pencil first. */
export function buildRound(key: string, pair: { y: YWord; z: ZWord }, first: boolean): TraceRound {
  const y = Y_WORDS[pair.y].label.toLowerCase();
  const z = Z_WORDS[pair.z].label.toLowerCase();
  return {
    key,
    glyphs: [glyph("y"), glyph("z")],
    copy: false,
    prompts: first
      ? [`Watch the pencil write small y. ${Y_CUE} Now you try! Start at the green dot.`, `Now small z. ${Z_CUE}`]
      : ["Watch, then trace small y.", "Now small z."],
    praise: `Another stripe for the scarf! y is for ${y}, and z is for ${z}!`,
    missed: "",
  };
}

export const INSTRUCTION = "Watch, then trace small y and small z!";

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write it!";

export const revealSpeech = (g: Glyph) => `This is the correct way to write ${g.say}! ${g.say === "small y" ? Y_CUE : Z_CUE}`;

export const DONE = "Cozy! The scarf is finished! You traced every small y and z!";

export const DONE_MISSED = "Good try! Keep practicing small y and small z, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You knitted ${score} out of ${total} stripes.`;
}
