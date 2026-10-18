// Self-check for the small b and d strokes and the review letters; run with: npx tsx "src/components/activities/games/writing readiness/3rd-quarter/week-4/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as B } from "./LowercaseBTrails.data";
import { STROKES as D } from "./LowercaseDTrails.data";
import { LETTERS } from "./WritingSkillsReview3.data";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 41;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// Each stroke passes in its own turn, backwards fails, and the second stroke first fails.
for (const strokes of [B, D]) {
  strokes.forEach((s, i) => {
    assert.equal(strokesCovered(drawn(s), strokes, i), 1);
    assert.equal(strokesCovered(drawn(reversed(s)), strokes, i), 0);
  });
  assert.equal(strokesCovered(drawn(strokes[1]), strokes, 0), 0);
}

// b and d are not mirror mix-ups: b's stem is on the left of its bowl, d's on the right.
assert.ok(B[0][0].x < B[1][20].x);
assert.ok(D[1][0].x > D[0][20].x);

// The review keeps the ten letters it needs, each first stroke tracing on its own.
for (const letter of "DPUGJRSQbd") assert.ok(letter in LETTERS, letter);
for (const { strokes } of Object.values(LETTERS)) assert.ok(strokesCovered(drawn(strokes[0]), strokes, 0) >= 1);

console.log("letters.check: ok");
