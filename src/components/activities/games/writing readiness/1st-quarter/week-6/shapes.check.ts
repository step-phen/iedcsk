// Self-check for judgeCopy; run with: npx tsx "src/components/activities/games/writing readiness/1st-quarter/week-6/shapes.check.ts"

import assert from "node:assert/strict";
import { judgeCopy, shapePath, type ShapeKind } from "./shapes";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 7;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 10;
const drawn = (kind: ShapeKind, w: number, h: number) => shapePath(kind, w, h).map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));

const cases: [ShapeKind, number, number][] = [
  ["circle", 240, 240],
  ["square", 220, 220],
  ["rectangle", 300, 160],
  ["rectangle", 150, 280],
  ["triangle", 260, 230],
];
const kinds: ShapeKind[] = ["circle", "square", "rectangle", "triangle"];

for (const [drawnKind, w, h] of cases) {
  for (const asked of kinds) {
    assert.equal(judgeCopy(drawn(drawnKind, w, h), asked), asked === drawnKind, `${drawnKind} ${w}x${h} judged as ${asked}`);
  }
}

// Children start anywhere and go either way round, so a copy started mid-side and drawn backwards still counts.
const fromMiddle = (pts: { x: number; y: number }[]) => [...pts.slice(30, -1), ...pts.slice(0, 31)].reverse();
for (const [kind, w, h] of cases) {
  assert.equal(judgeCopy(fromMiddle(drawn(kind, w, h)), kind), true, `${kind} started mid-side, drawn backwards`);
}

// Unfinished, tiny and scribbled copies never pass.
assert.equal(judgeCopy(drawn("circle", 240, 240).slice(0, 70), "circle"), false, "three-quarter circle");
assert.equal(judgeCopy(drawn("square", 60, 60), "square"), false, "tiny square");
assert.equal(judgeCopy([{ x: 100, y: 100 }, ...drawn("triangle", 260, 230).slice(10, 40)], "triangle"), false, "open scribble");

console.log("judgeCopy checks passed");
