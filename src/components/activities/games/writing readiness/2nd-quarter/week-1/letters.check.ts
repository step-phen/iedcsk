// Self-check for strokesCovered; run with: npx tsx "src/components/activities/games/writing readiness/2nd-quarter/week-1/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "./LetterTracePad";
import { T_STROKES } from "./LetterTTrails.data";
import { L_STROKES } from "./LetterLTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 7;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));

// T: across first, then down; going down first is the wrong order.
assert.equal(strokesCovered(drawn(T_STROKES[0]), T_STROKES, 0), 1);
assert.equal(strokesCovered(drawn(T_STROKES[1]), T_STROKES, 1), 1);
assert.equal(strokesCovered(drawn(T_STROKES[1]), T_STROKES, 0), 0);
assert.equal(strokesCovered(drawn([...T_STROKES[0]].reverse()), T_STROKES, 0), 0);

// L: down then across, lifted or in one go; across first is the wrong order.
assert.equal(strokesCovered(drawn(L_STROKES[0]), L_STROKES, 0), 1);
assert.equal(strokesCovered(drawn(L_STROKES[1]), L_STROKES, 1), 1);
assert.equal(strokesCovered(drawn([...L_STROKES[0], ...L_STROKES[1].slice(1)]), L_STROKES, 0), 2);
assert.equal(strokesCovered(drawn(L_STROKES[1]), L_STROKES, 0), 0);
assert.equal(strokesCovered(drawn([...L_STROKES[0]].reverse()), L_STROKES, 0), 0);

console.log("letters.check: ok");
