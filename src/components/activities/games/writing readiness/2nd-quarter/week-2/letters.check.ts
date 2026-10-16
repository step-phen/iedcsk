// Self-check for the I, H and F strokes; run with: npx tsx "src/components/activities/games/writing readiness/2nd-quarter/week-2/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../week-1/LetterTracePad";
import { I_STROKES } from "./LetterITrails.data";
import { H_STROKES } from "./LetterHTrails.data";
import { F_STROKES } from "./LetterFTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 13;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn, backwards fails, and jumping ahead to a later stroke fails.
for (const strokes of [I_STROKES, H_STROKES, F_STROKES]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  assert.equal(strokesCovered(drawn(strokes[1]), strokes, 0), 0);
  assert.equal(strokesCovered(drawn(strokes[2]), strokes, 0), 0);
}

console.log("letters.check: ok");
