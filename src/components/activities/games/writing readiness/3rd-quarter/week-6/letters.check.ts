// Self-check for the small i, f and m strokes; run with: npx tsx "src/components/activities/games/writing readiness/3rd-quarter/week-6/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as I } from "./LowercaseITrails.data";
import { STROKES as F } from "./LowercaseFTrails.data";
import { STROKES as M } from "./LowercaseMTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 61;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each line or curve passes in its own turn and backwards fails.
for (const strokes of [F, M]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
}

// i: line down, then a tap on the dot; the dot first, or a tap far off, misses.
assert.equal(strokesCovered(drawn(I[0]), I, 0), 1);
assert.equal(strokesCovered(drawn(reversed(I[0])), I, 0), 0);
assert.equal(strokesCovered([{ x: 253, y: 104 }], I, 1), 1);
assert.equal(strokesCovered([{ x: 253, y: 104 }], I, 0), 0);
assert.equal(strokesCovered([{ x: 400, y: 300 }], I, 1), 0);

// f: the cross first misses; m: the second hump first misses.
assert.equal(strokesCovered(drawn(F[1]), F, 0), 0);
assert.equal(strokesCovered(drawn(M[2]), M, 1), 0);

console.log("letters.check: ok");
