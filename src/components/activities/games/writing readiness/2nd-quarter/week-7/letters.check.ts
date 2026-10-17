// Self-check for the Z strokes and the shared capital map; run with: npx tsx "src/components/activities/games/writing readiness/2nd-quarter/week-7/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../week-1/LetterTracePad";
import { Z_STROKES } from "./LetterZTrails.data";
import { CAPITALS } from "./capitalLetters";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 37;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();
const joined = (strokes: { x: number; y: number }[][]) => strokes.flatMap((s, i) => (i === 0 ? s : s.slice(1)));

// Each Z stroke passes in its own turn and backwards fails; the whole Z may be drawn in one go.
Z_STROKES.forEach((s, i) => {
  assert.equal(strokesCovered(drawn(s), Z_STROKES, i), 1);
  assert.equal(strokesCovered(drawn(reversed(s)), Z_STROKES, i), 0);
});
assert.equal(strokesCovered(drawn(Z_STROKES[2]), Z_STROKES, 0), 0);
assert.equal(strokesCovered(drawn(joined(Z_STROKES)), Z_STROKES, 0), 3);

// All 17 taught capitals are on the map, each first stroke tracing on its own.
assert.equal(Object.keys(CAPITALS).join(""), "TLIHFEVXWBCAMNKYZ");
for (const { strokes } of Object.values(CAPITALS)) assert.ok(strokesCovered(drawn(strokes[0]), strokes, 0) >= 1);

console.log("letters.check: ok");
