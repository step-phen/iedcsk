// Self-check for the numeral strokes 1 to 10; run with: npx tsx "src/components/activities/games/writing readiness/4th-quarter/week-4/numerals.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { numeralStrokes, VIEW_W, VIEW_H } from "./NumberTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 47;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each round's strokes stay on the board, pass in turn, and fail drawn backwards or out of order.
for (const pair of [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]) {
  const strokes = numeralStrokes(pair);
  for (const p of strokes.flat()) assert.ok(p.x > 10 && p.x < VIEW_W - 10 && p.y > 10 && p.y < VIEW_H - 10, `${pair} leaves the board`);
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1, `${pair} stroke ${i + 1}`);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0, `${pair} stroke ${i + 1} backwards`);
  });
  assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0, `${pair} last stroke first`);
}

console.log("numerals.check: ok");
