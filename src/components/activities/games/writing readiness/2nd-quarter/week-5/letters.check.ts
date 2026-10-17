// Self-check for the C, A and M strokes; run with: npx tsx "src/components/activities/games/writing readiness/2nd-quarter/week-5/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../week-1/LetterTracePad";
import { C_STROKES } from "./LetterCTrails.data";
import { A_STROKES } from "./LetterATrails.data";
import { M_STROKES } from "./LetterMTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 29;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();
const joined = (strokes: { x: number; y: number }[][]) => strokes.flatMap((s, i) => (i === 0 ? s : s.slice(1)));

// Each stroke passes in its own turn and backwards fails.
for (const strokes of [C_STROKES, A_STROKES, M_STROKES]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
}

// A later stroke first fails, including A's line across.
assert.equal(strokesCovered(drawn(A_STROKES[1]), A_STROKES, 0), 0);
assert.equal(strokesCovered(drawn(A_STROKES[2]), A_STROKES, 0), 0);
assert.equal(strokesCovered(drawn(M_STROKES[3]), M_STROKES, 0), 0);

// After the first line, M's slant, slant and line down may be drawn in one go, or picked up partway.
assert.equal(strokesCovered(drawn(joined(M_STROKES.slice(1))), M_STROKES, 1), 3);
assert.equal(strokesCovered(drawn(joined(M_STROKES.slice(1, 3))), M_STROKES, 1), 2);

console.log("letters.check: ok");
