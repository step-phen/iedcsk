// Self-check for the E, V and X strokes; run with: npx tsx "src/components/activities/games/writing readiness/2nd-quarter/week-3/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../week-1/LetterTracePad";
import { E_STROKES } from "./LetterETrails.data";
import { V_STROKES } from "./LetterVTrails.data";
import { X_STROKES } from "./LetterXTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 17;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn, backwards fails, and a later stroke first fails.
for (const strokes of [E_STROKES, V_STROKES, X_STROKES]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  assert.equal(strokesCovered(drawn(strokes[strokes.length - 1]), strokes, 0), 0);
}

// V may be drawn in one go without lifting, down then up; X may not, since its slants cross instead of meeting.
assert.equal(strokesCovered(drawn([...V_STROKES[0], ...V_STROKES[1].slice(1)]), V_STROKES, 0), 2);
assert.equal(strokesCovered(drawn([...X_STROKES[0], ...X_STROKES[1]]), X_STROKES, 0), 0);

console.log("letters.check: ok");
