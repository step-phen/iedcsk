export const TITLE = "LEFT CURVE PATHS";

export const DIRECTION_TEXT = "Direction: Trace the curving lines.";

// The tracing board is a fixed coordinate space that the stage scales to fit.
export const VIEW_W = 800;
export const VIEW_H = 200;
export const TOP_Y = 40;
export const MID_Y = 100;
export const BOTTOM_Y = 160;
// How far each curve's control point sits left of its endpoints; big enough that a straight line cannot pass the bulge.
export const BULGE = 66;
export const MARGIN_X = 60;
export const STROKE_COUNT = 5;
// Dense samples along each curve for the distance checks.
export const CURVE_SAMPLES = 30;

// How close the drawing must stay to the curve to count as on the path.
export const CORRIDOR_TOL = 20;
// The share of a stroke's points that must land inside the corridor to pass.
export const COVERAGE_PASS_RATIO = 0.8;
// Ordered checkpoints along the curve, from the top end (1) to the bottom end (0).
export const CHECKPOINT_TS = [1, 0.8, 0.6, 0.4, 0.2, 0];
// A pointer jump bigger than this is treated as a new stroke.
export const MAX_JUMP = 45;

// Every row repeats the same curves, and the DB has one question per row.
export const CODE_ROUNDS = 5;

// Colors drawn on the board.
export const COLORS = {
  ruleBlue: "#5B8EF4",
  ruleRed: "#E15A5A",
  guide: "#1E2A4A",
  traceGreen: "#3FAE72",
  traceRed: "#E15A5A",
} as const;

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  a: Point;
  b: Point;
  c: Point;
  points: Point[];
  checkpoints: Point[];
}

// A quadratic bezier point: (1-t)^2 A + 2(1-t)t C + t^2 B.
function bezierPoint(a: Point, b: Point, c: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
    y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y,
  };
}

function curvePoints(a: Point, b: Point, c: Point, samples: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) pts.push(bezierPoint(a, b, c, i / (samples - 1)));
  return pts;
}

function buildStrokes(): Stroke[] {
  const strokes: Stroke[] = [];
  const step = (VIEW_W - MARGIN_X * 2) / (STROKE_COUNT - 1);
  for (let i = 0; i < STROKE_COUNT; i++) {
    const bx = MARGIN_X + step * i;
    const a: Point = { x: bx, y: BOTTOM_Y };
    const b: Point = { x: bx, y: TOP_Y };
    const c: Point = { x: bx - BULGE, y: MID_Y };
    strokes.push({
      a,
      b,
      c,
      points: curvePoints(a, b, c, CURVE_SAMPLES),
      checkpoints: CHECKPOINT_TS.map((t) => bezierPoint(a, b, c, t)),
    });
  }
  return strokes;
}

export const STROKES = buildStrokes();

// Spoken praise, picked at random so it does not repeat.
export const TRACE_PRAISE_LINES = [
  "Great tracing!",
  "You did it!",
  "Nice job!",
  "Well done!",
  "Awesome work!",
  "Fantastic!",
  "You got it!",
  "Super tracing!",
];

// Spoken when a curve was not followed.
export const TRACE_RETRY_LINES = [
  "Oops! Follow the curved line. Try again!",
  "Almost! Try tracing the curve again.",
  "Not quite — follow the dashed line!",
  "Let's try that curve again!",
];

// The toast shown on the board after a curve.
export const CURVE_OK_TEXT = "Great Tracing!";
export const CURVE_FAIL_TEXT = "Oops! Try again!";

export interface BadgeTier {
  title: string;
  sub: string;
  emoji: string;
}

export function getBadgeTier(score: number, total: number): BadgeTier {
  if (score === total && total > 0) return { title: "GOLD BADGE", sub: "Perfect! Every row traced beautifully!", emoji: "🏆" };
  if (score >= Math.ceil(total * 0.6)) return { title: "SILVER BADGE", sub: "Great job tracing those curves!", emoji: "🥈" };
  if (score >= 1) return { title: "STARTER BADGE", sub: "Nice try! Keep practicing your curves!", emoji: "🌱" };
  return { title: "KEEP PRACTICING BADGE", sub: "Every try helps you learn — keep going!", emoji: "✏️" };
}

/** What is said when the result screen appears. */
export const resultSpeech = (score: number, total: number) => `You got ${score} out of ${total}! ${getBadgeTier(score, total).sub}`;
