// Shape guides for the Week 6 trace-and-copy games, and the check for a shape the child copies freehand.

import type { Point } from "../week-4/TracePad";

// Each pad (the trace guide and the copy box) is this square board.
export const PAD = 420;
const C = PAD / 2;

export type ShapeKind = "circle" | "square" | "rectangle" | "triangle";

/** A closed outline evenly sampled along its sides, starting and ending at its first corner. */
function polygonPath(corners: Point[], samples = 96): Point[] {
  const ring = [...corners, corners[0]];
  const lens = ring.slice(1).map((p, i) => Math.hypot(p.x - ring[i].x, p.y - ring[i].y));
  const total = lens.reduce((a, b) => a + b, 0);
  return Array.from({ length: samples }, (_, k) => {
    let d = (total * k) / (samples - 1);
    let i = 0;
    while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
    const f = Math.min(d / lens[i], 1);
    return { x: ring[i].x + (ring[i + 1].x - ring[i].x) * f, y: ring[i].y + (ring[i + 1].y - ring[i].y) * f };
  });
}

/**
 * The guide for a shape of the given width and height, centred on the pad, in the order it is written:
 * a circle from the top round to the left; a square or rectangle from the top-left corner across, down, back and up; a triangle from its tip down to the right, across and back up.
 */
export function shapePath(kind: ShapeKind, w: number, h: number): Point[] {
  if (kind === "circle") {
    return Array.from({ length: 96 }, (_, k) => {
      const a = (2 * Math.PI * k) / 95;
      return { x: C - (w / 2) * Math.sin(a), y: C - (h / 2) * Math.cos(a) };
    });
  }
  if (kind === "triangle") {
    return polygonPath([
      { x: C, y: C - h / 2 },
      { x: C + w / 2, y: C + h / 2 },
      { x: C - w / 2, y: C + h / 2 },
    ]);
  }
  return polygonPath([
    { x: C - w / 2, y: C - h / 2 },
    { x: C + w / 2, y: C - h / 2 },
    { x: C + w / 2, y: C + h / 2 },
    { x: C - w / 2, y: C + h / 2 },
  ]);
}

/** Ramer-Douglas-Peucker: keeps only the points that bend the line by more than eps. */
function simplify(pts: Point[], eps: number): Point[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let far = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b.x - a.x) * (a.y - pts[i].y) - (a.x - pts[i].x) * (b.y - a.y)) / len;
    if (d > far) [far, at] = [d, i];
  }
  if (far <= eps) return [a, b];
  return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}

/** How sharply the outline turns at each corner of a closed simplified outline, in degrees. */
function turns(stroke: Point[], eps: number): number[] {
  // Split at the far point so a closed stroke simplifies as two open halves.
  const far = stroke.reduce((best, p, i) => (Math.hypot(p.x - stroke[0].x, p.y - stroke[0].y) > Math.hypot(stroke[best].x - stroke[0].x, stroke[best].y - stroke[0].y) ? i : best), 0);
  const ring = [...simplify(stroke.slice(0, far + 1), eps).slice(0, -1), ...simplify([...stroke.slice(far), stroke[0]], eps).slice(0, -1)];
  return ring.map((p, i) => {
    const prev = ring[(i - 1 + ring.length) % ring.length];
    const next = ring[(i + 1) % ring.length];
    const a1 = Math.atan2(p.y - prev.y, p.x - prev.x);
    const a2 = Math.atan2(next.y - p.y, next.x - p.x);
    const d = Math.abs(((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    return (d * 180) / Math.PI;
  });
}

/** Whether a freehand stroke is a fair copy of the shape: big enough, closed, and the right kind (round, or with the right corners and proportions). */
export function judgeCopy(stroke: Point[], kind: ShapeKind): boolean {
  if (stroke.length < 12) return false;
  const xs = stroke.map((p) => p.x);
  const ys = stroke.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const size = Math.max(w, h);
  const aspect = w / Math.max(h, 1);
  const [first, last] = [stroke[0], stroke[stroke.length - 1]];
  if (size < 100 || Math.min(w, h) < 40) return false;
  if (Math.hypot(first.x - last.x, first.y - last.y) > Math.max(45, size * 0.3)) return false;

  if (kind === "circle") {
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const radii = stroke.map((p) => Math.hypot(p.x - cx, p.y - cy));
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    const spread = Math.sqrt(radii.reduce((a, r) => a + (r - mean) ** 2, 0) / radii.length) / mean;
    // A round shape has no sharp corner, which is what tells it apart from a square.
    return spread < 0.25 && aspect > 0.6 && aspect < 1.67 && Math.max(...turns(stroke, size * 0.06)) < 75;
  }

  const corners = turns(stroke, size * 0.1).filter((t) => t > 40).length;
  if (kind === "triangle") return corners === 3;
  if (corners < 4 || corners > 5) return false;
  return kind === "square" ? aspect > 0.7 && aspect < 1.43 : aspect <= 0.77 || aspect >= 1.3;
}
