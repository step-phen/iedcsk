// Self-check for the R, S and Q strokes; run with: npx tsx "src/components/activities/games/writing readiness/3rd-quarter/week-3/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { R_STROKES } from "./LetterRTrails.data";
import { S_STROKES } from "./LetterSTrails.data";
import { Q_STROKES } from "./LetterQTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 23;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn and fails drawn backwards; a later stroke drawn first fails.
for (const strokes of [R_STROKES, S_STROKES, Q_STROKES]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  if (strokes.length > 1) assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

// R's curve and slant meet at the middle of the line, so drawing them without lifting is never a miss.
assert.ok(strokesCovered(drawn([...R_STROKES[1], ...R_STROKES[2].slice(1)]), R_STROKES, 1) >= 1);

console.log("letters.check: ok");
