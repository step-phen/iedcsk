export const ASSETS = {
  background: "/images/activities/left-slant/left-slant-bg.webp",
  titleBanner: "/images/activities/left-slant/title-bannner.webp",
};

/** The score picture shown in the corner, e.g. "/images/activities/left-slant/score/score3.webp". */
export const scoreImage = (score: number) => `/images/activities/left-slant/score/score${score}.webp`;

export const TITLE = "LEFT SLANT TRAILS";

// The tracing board is a fixed coordinate space that the stage scales to fit.
export const VIEW_W = 800;
export const VIEW_H = 200;
export const TOP_Y = 40;
export const MID_Y = 100;
export const BOTTOM_Y = 160;
// Leftward shift from a stroke's bottom point to its top point.
export const LEAN = -22;
export const MARGIN_X = 60;
export const STROKE_COUNT = 5;

// Distances are in board units: the spacing of the guide dots, what counts as on the path, and what counts as off it but nearby.
export const DOT_SPACING = 15;
export const GREEN_TOL = 20;
export const RED_TOL = 50;
// A pointer jump bigger than this is treated as a new stroke.
export const MAX_JUMP = 45;

// Every row repeats the same strokes, and the DB has one question per row.
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
  points: Point[];
}

function linePoints(a: Point, b: Point, spacing: number): Point[] {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.round(length / spacing) + 1);
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return pts;
}

function buildStrokes(): Stroke[] {
  const strokes: Stroke[] = [];
  const step = (VIEW_W - MARGIN_X * 2) / (STROKE_COUNT - 1);
  for (let i = 0; i < STROKE_COUNT; i++) {
    const bx = MARGIN_X + step * i;
    const a: Point = { x: bx, y: BOTTOM_Y };
    const b: Point = { x: bx + LEAN, y: TOP_Y };
    strokes.push({ a, b, points: linePoints(a, b, DOT_SPACING) });
  }
  return strokes;
}

export const STROKES = buildStrokes();
export const TOTAL_POINTS = STROKES.reduce((sum, s) => sum + s.points.length, 0);

// Spoken praise after each finished row.
export const ROW_DONE_LINES = ["Great tracing!", "You did it!", "Nice job!", "Well done!"];

export const ROW_DONE_TEXT = "Great Tracing!";

/** What is said when the result screen appears. */
export const resultSpeech = (score: number, total: number) => `You got ${score} out of ${total}!`;
