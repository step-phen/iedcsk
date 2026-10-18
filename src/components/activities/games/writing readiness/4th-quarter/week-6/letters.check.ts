// Self-check for the small v, w and x strokes; run with: npx tsx "src/components/activities/games/writing readiness/4th-quarter/week-6/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as V } from "./LowercaseVTrails.data";
import { STROKES as W } from "./LowercaseWTrails.data";
import { STROKES as X } from "./LowercaseXTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 61;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn and fails drawn backwards; a later stroke drawn first fails.
for (const strokes of [V, W, X]) {
  strokes.forEach((s, i) => {
    assert.ok(strokesCovered(drawn(s), strokes, i) >= 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

// The slants of v and w meet end to start, so they may be drawn without lifting.
assert.equal(strokesCovered(drawn([...V[0], ...V[1].slice(1)]), V, 0), 2);
assert.equal(strokesCovered(drawn(W.flatMap((s, i) => (i ? s.slice(1) : s))), W, 0), 4);

console.log("letters.check: ok");
