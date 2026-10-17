// Self-check for the N, K and Y strokes; run with: npx tsx "src/components/activities/games/writing readiness/2nd-quarter/week-6/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../week-1/LetterTracePad";
import { N_STROKES } from "./LetterNTrails.data";
import { K_STROKES } from "./LetterKTrails.data";
import { Y_STROKES } from "./LetterYTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 31;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();
const joined = (strokes: { x: number; y: number }[][]) => strokes.flatMap((s, i) => (i === 0 ? s : s.slice(1)));

// Each stroke passes in its own turn, backwards fails, and the last stroke first fails.
for (const strokes of [N_STROKES, K_STROKES, Y_STROKES]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

// After the first stroke, the last two of each letter may be drawn in one go.
for (const strokes of [N_STROKES, K_STROKES, Y_STROKES]) assert.equal(strokesCovered(drawn(joined(strokes.slice(1))), strokes, 1), 2);

console.log("letters.check: ok");
