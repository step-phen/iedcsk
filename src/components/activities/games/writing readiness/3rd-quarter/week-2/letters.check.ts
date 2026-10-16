// Self-check for the U, G and J strokes; run with: npx tsx "src/components/activities/games/writing readiness/3rd-quarter/week-2/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { U_STROKES } from "./LetterUTrails.data";
import { G_STROKES } from "./LetterGTrails.data";
import { J_STROKES } from "./LetterJTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 19;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn and fails drawn backwards; a later stroke drawn first fails.
for (const strokes of [U_STROKES, G_STROKES, J_STROKES]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  if (strokes.length > 1) assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

// Running on into G's short line in without lifting still counts the C, never a miss.
assert.ok(strokesCovered(drawn([...G_STROKES[0], ...G_STROKES[1].slice(1)]), G_STROKES, 0) >= 1);

console.log("letters.check: ok");
