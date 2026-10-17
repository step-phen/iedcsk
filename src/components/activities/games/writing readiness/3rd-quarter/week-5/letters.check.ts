// Self-check for the small h, t and l strokes; run with: npx tsx "src/components/activities/games/writing readiness/3rd-quarter/week-5/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as H } from "./LowercaseHTrails.data";
import { STROKES as T } from "./LowercaseTTrails.data";
import { STROKES as L } from "./LowercaseLTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 43;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn and backwards fails.
for (const strokes of [H, T, L]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
}

// The hump of h and the cross of t drawn first fail.
assert.equal(strokesCovered(drawn(H[1]), H, 0), 0);
assert.equal(strokesCovered(drawn(T[1]), T, 0), 0);

// l stops at the base line, not the tail line.
assert.equal(L[0][L[0].length - 1].y, 300);

console.log("letters.check: ok");
