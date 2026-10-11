// Strokes, shapes and spoken lines shared by the Writing Readiness Review and Final Assessment; tools and posture come from Writing Skills Review 1.

import { samplePath, type Point } from "../week-4/TracePad";
import { STROKES as WEEK4_STROKES, RULES, VIEW_W, VIEW_H } from "../week-4/WritingSkillsReview1.data";
import type { ShapeKind } from "../week-6/shapes";

export { VIEW_W, VIEW_H, RULES };
export {
  TOOL_PROMPT,
  POSTURE_PROMPT,
  POSTURE_REVEAL,
  POSTURE_NAMES,
  POSTURE_IMAGES,
  isPosture,
  itemAsset,
  itemLabel,
  toolReveal,
  type Posture,
} from "../week-4/WritingSkillsReview1.data";

// The zigzag's corners: up and down slants across the writing lines.
const ZIG: Point[] = [150, 250, 350, 450, 550, 650].map((x, i) => ({ x, y: i % 2 ? RULES.top : RULES.base }));

// Every stroke a trace task can ask for: Week 4's lines, slants and curves, plus the zigzag and the circle.
export const STROKES: Record<string, { path: Point[]; prompt: string; reveal: string }> = {
  ...WEEK4_STROKES,
  zigzag: {
    path: samplePath((t) => {
      const legs = ZIG.length - 1;
      const leg = Math.min(Math.floor(t * legs), legs - 1);
      const f = t * legs - leg;
      return { x: ZIG[leg].x + (ZIG[leg + 1].x - ZIG[leg].x) * f, y: ZIG[leg].y + (ZIG[leg + 1].y - ZIG[leg].y) * f };
    }, 101),
    prompt: "Trace the zigzag, from the green dot, up and down, to the star.",
    reveal: "Like this! Up, down, up, down.",
  },
  circle: {
    path: samplePath((t) => ({ x: 400 - 110 * Math.sin(2 * Math.PI * t), y: RULES.mid - 110 * Math.cos(2 * Math.PI * t) }), 90),
    prompt: "Trace the circle. Start at the green dot, follow the arrow, and go all the way around.",
    reveal: "Like this! Round and round, back to the start.",
  },
};

export const isStroke = (value: unknown): value is string => typeof value === "string" && value in STROKES;

// Every shape a copy task can ask for, at the size its model is drawn.
export const SHAPES: Record<ShapeKind, { w: number; h: number; reveal: string }> = {
  circle: { w: 260, h: 260, reveal: "A circle goes round and round, back to the start, like this!" },
  square: { w: 240, h: 240, reveal: "A square has four sides that are all the same, like this!" },
  rectangle: { w: 320, h: 180, reveal: "A rectangle has two long sides and two short sides, like this!" },
  triangle: { w: 280, h: 250, reveal: "A triangle has three sides and three corners, like this!" },
};

export const isShape = (value: unknown): value is ShapeKind => typeof value === "string" && value in SHAPES;

export const copyPrompt = (shape: ShapeKind) => `Look at the ${shape}. Now draw your own ${shape} in the empty box!`;

export const TRACE_TEXT = "Trace from the green dot!";

export const COPY_TEXT = "Copy the shape in the empty box!";

export const RIGHT = "That's correct!";

export const WRONG_TAP = "Oops, not that one!";

export const WRONG_DRAW = "Oops! Watch the pencil do it.";
