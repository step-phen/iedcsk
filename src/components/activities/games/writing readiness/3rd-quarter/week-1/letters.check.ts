// Self-check for the D, O and P strokes; run with: npx tsx "src/components/activities/games/writing readiness/3rd-quarter/week-1/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { D_STROKES } from "./LetterDTrails.data";
import { O_STROKES } from "./LetterOTrails.data";
import { P_STROKES } from "./LetterPTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 11;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// D and P: line down first, then the curve; the curve first (it starts at the same dot) is the wrong order.
for (const strokes of [D_STROKES, P_STROKES]) {
  assert.equal(strokesCovered(drawn(strokes[0]), strokes, 0), 1);
  assert.equal(strokesCovered(drawn(strokes[1]), strokes, 1), 1);
  assert.equal(strokesCovered(drawn(strokes[1]), strokes, 0), 0);
  assert.equal(strokesCovered(drawn(reversed(strokes[1])), strokes, 1), 0);
}

// O: from the top going left; going right (the other way round) misses.
assert.equal(strokesCovered(drawn(O_STROKES[0]), O_STROKES, 0), 1);
assert.equal(strokesCovered(drawn(reversed(O_STROKES[0])), O_STROKES, 0), 0);

console.log("letters.check: ok");
