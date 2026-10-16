// Self-check for the small q, o and s strokes; run with: npx tsx "src/components/activities/games/writing readiness/4th-quarter/week-3/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as Q } from "./LowercaseQTrails.data";
import { STROKES as O } from "./LowercaseOTrails.data";
import { STROKES as S } from "./LowercaseSTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 31;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn and fails drawn backwards; a later stroke drawn first fails.
for (const strokes of [Q, O, S]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  if (strokes.length > 1) assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

console.log("letters.check: ok");
