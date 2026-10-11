// Task wording, stroke shapes and spoken lines for Writing Skills Review 1; tool pictures come from Pack My Writing Bag, the greeting and intro from lib/speech-lines.ts.

import { samplePath, type Point } from "./TracePad";

export { itemAsset, itemLabel } from "../week-1/ThingsINeedForMyWritingActivities.data";

export const VIEW_W = 800;
export const VIEW_H = 360;
// The ruled writing lines on each page: top, middle (dashed) and base.
export const RULES = { top: 70, mid: 180, base: 290 };

export type Stroke = "line" | "vertical" | "slant" | "left-slant" | "curve" | "overcurve" | "undercurve";

export const STROKES: Record<Stroke, { path: Point[]; prompt: string; reveal: string }> = {
  line: {
    path: samplePath((t) => ({ x: 150 + 500 * t, y: RULES.mid })),
    prompt: "Trace the straight line, from the green dot all the way across to the star.",
    reveal: "Like this! Straight across.",
  },
  vertical: {
    path: samplePath((t) => ({ x: 400, y: RULES.top + (RULES.base - RULES.top) * t })),
    prompt: "Trace the standing line, from the top straight down to the star.",
    reveal: "Like this! Straight down.",
  },
  // A right slant leans like "/", traced from its top down.
  slant: {
    path: samplePath((t) => ({ x: 490 - 180 * t, y: RULES.top + (RULES.base - RULES.top) * t })),
    prompt: "Trace the slanting line, from the top down to the star.",
    reveal: "Like this! Slant down from the top.",
  },
  // A left slant leans like "\", traced from its top down.
  "left-slant": {
    path: samplePath((t) => ({ x: 310 + 180 * t, y: RULES.top + (RULES.base - RULES.top) * t })),
    prompt: "Trace the slanting line, from the top down to the star.",
    reveal: "Like this! Slant down from the top.",
  },
  // A "c" curve from its top-right tip, over the top, around the left, and out to its bottom-right tip.
  curve: {
    path: samplePath((t) => {
      const a = ((30 + 300 * t) * Math.PI) / 180;
      return { x: 400 + 130 * Math.cos(a), y: RULES.mid - 110 * Math.sin(a) };
    }),
    prompt: "Trace the curve. Start at the top, go around, and stop at the star.",
    reveal: "Like this! Over the top and around.",
  },
  overcurve: {
    path: samplePath((t) => ({ x: 400 - 180 * Math.cos(Math.PI * t), y: RULES.base - 210 * Math.sin(Math.PI * t) })),
    prompt: "Trace the hill curve. Go up, over the top, and down to the star.",
    reveal: "Like this! Up, over the hill, and down.",
  },
  undercurve: {
    path: samplePath((t) => ({ x: 400 - 180 * Math.cos(Math.PI * t), y: RULES.top + 210 * Math.sin(Math.PI * t) })),
    prompt: "Trace the smile curve. Go down, around the bottom, and up to the star.",
    reveal: "Like this! Down, around, and up.",
  },
};

export const isStroke = (value: unknown): value is Stroke => typeof value === "string" && value in STROKES;

export type Posture = "upright" | "slouch";

export const isPosture = (value: unknown): value is Posture => value === "upright" || value === "slouch";

export const POSTURE_NAMES: Record<Posture, string> = { upright: "Sitting up straight", slouch: "Slouching" };

// The same child at the same desk, sitting the right way and slouched over.
export const POSTURE_IMAGES: Record<Posture, string> = {
  upright: "/images/activities/writing-skills-review-1/posture-upright.webp",
  slouch: "/images/activities/writing-skills-review-1/posture-slouch.webp",
};

export const TOOL_PROMPT = "Which one do we use for writing?";

export const POSTURE_PROMPT = "Which child is sitting the right way to write?";

export const TRACE_TEXT = "Trace from the green dot to the star!";

export const RIGHT = "That's correct!";

export const WRONG_TAP = "Oops, not that one!";

export const WRONG_TRACE = "Oops! Watch the pencil trace it.";

export function toolReveal(tool: string, label: string): string {
  return `The ${label.toLowerCase()} is for writing.${tool === "pencil" ? " We hold it to write and draw." : ""}`;
}

export const POSTURE_REVEAL = "This child sits up straight, with feet flat on the floor and the paper on the desk.";

export const DONE_TEXT = "Your writing notebook is all done!";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
