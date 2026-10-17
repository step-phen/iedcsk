// Self-check for the W and B strokes; run with: npx tsx "src/components/activities/games/writing readiness/2nd-quarter/week-4/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../week-1/LetterTracePad";
import { W_STROKES } from "./LetterWTrails.data";
import { B_STROKES } from "./LetterBTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 23;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();
const joined = (strokes: { x: number; y: number }[][]) => strokes.flatMap((s, i) => (i === 0 ? s : s.slice(1)));

// Each stroke passes in its own turn, backwards fails, and a later stroke first fails.
for (const strokes of [W_STROKES, B_STROKES]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

// W may be drawn in one go, or picked up partway; B's two bumps may be drawn as one, but not together with the line down.
assert.equal(strokesCovered(drawn(joined(W_STROKES)), W_STROKES, 0), 4);
assert.equal(strokesCovered(drawn(joined(W_STROKES.slice(0, 2))), W_STROKES, 0), 2);
assert.equal(strokesCovered(drawn(joined(W_STROKES.slice(1))), W_STROKES, 1), 3);
assert.equal(strokesCovered(drawn(joined(B_STROKES.slice(1))), B_STROKES, 1), 2);
assert.equal(strokesCovered(drawn(joined(B_STROKES)), B_STROKES, 0), 0);

console.log("letters.check: ok");
