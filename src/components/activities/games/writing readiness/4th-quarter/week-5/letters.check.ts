// Self-check for the small r, k and u strokes; run with: npx tsx "src/components/activities/games/writing readiness/4th-quarter/week-5/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as R } from "./LowercaseRTrails.data";
import { STROKES as K } from "./LowercaseKTrails.data";
import { STROKES as U } from "./LowercaseUTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 53;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn and fails drawn backwards; a later stroke drawn first fails.
for (const strokes of [R, K, U]) {
  strokes.forEach((s, i) => {
    assert.ok(strokesCovered(drawn(s), strokes, i) >= 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

// The slant in and slant out of k, and the up-and-down of u, may each be drawn without lifting.
assert.equal(strokesCovered(drawn([...K[1], ...K[2].slice(1)]), K, 1), 2);
assert.equal(strokesCovered(drawn([...U[0], ...U[1].slice(1)]), U, 0), 2);

console.log("letters.check: ok");
