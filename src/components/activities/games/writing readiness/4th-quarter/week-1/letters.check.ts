// Self-check for the small g, p and j strokes; run with: npx tsx "src/components/activities/games/writing readiness/4th-quarter/week-1/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as G } from "./LowercaseGTrails.data";
import { STROKES as P } from "./LowercasePTrails.data";
import { STROKES as J } from "./LowercaseJTrails.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 5;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// g: circle back first, then down and hook; the circle the other way round, or the line first, misses.
assert.equal(strokesCovered(drawn(G[0]), G, 0), 1);
assert.equal(strokesCovered(drawn(G[1]), G, 1), 1);
assert.equal(strokesCovered(drawn(reversed(G[0])), G, 0), 0);
assert.equal(strokesCovered(drawn(G[1]), G, 0), 0);

// p: down first, then the curve from the middle line; the curve first misses.
assert.equal(strokesCovered(drawn(P[0]), P, 0), 1);
assert.equal(strokesCovered(drawn(P[1]), P, 1), 1);
assert.equal(strokesCovered(drawn(P[1]), P, 0), 0);

// j: down and hook, then a tap on the dot; a tap far from the dot, or the dot first, misses.
assert.equal(strokesCovered(drawn(J[0]), J, 0), 1);
assert.equal(strokesCovered([{ x: 283, y: 104 }], J, 1), 1);
assert.equal(strokesCovered([{ x: 400, y: 300 }], J, 1), 0);
assert.equal(strokesCovered([{ x: 283, y: 104 }], J, 0), 0);

console.log("letters.check: ok");
