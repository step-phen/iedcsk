// Self-check for the small n strokes and the shared Quarter 3 letter map; run with: npx tsx "src/components/activities/games/writing readiness/3rd-quarter/week-7/letters.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { STROKES as N } from "./LowercaseNTrails.data";
import { LETTERS } from "./thirdQuarterLetters";

// A hand-drawn look: each point nudged a little, the same way every run.
let seed = 77;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));
const reversed = <T,>(pts: T[]) => [...pts].reverse();

// n: each stroke passes in its own turn, backwards fails, and the hump first fails.
N.forEach((s, i) => {
  assert.equal(strokesCovered(drawn(s), N, i), 1);
  assert.equal(strokesCovered(drawn(reversed(s)), N, i), 0);
});
assert.equal(strokesCovered(drawn(N[1]), N, 0), 0);

// Every Quarter 3 letter is in the map, and every round the review seeders send is one of them.
assert.deepEqual(Object.keys(LETTERS).sort(), [..."DOPUGJRSQbdhtlifmn"].sort());
for (const letter of [..."OPGJSdhifn", ..."DOPUGRSQbhtlfmn"]) assert.ok(letter in LETTERS, letter);

// Each letter traced stroke by stroke passes from start to finish.
for (const [letter, { strokes }] of Object.entries(LETTERS)) {
  strokes.forEach((s, i) => assert.ok(strokesCovered(drawn(s), strokes, i) >= 1, `${letter} stroke ${i + 1}`));
}

console.log("letters.check: ok");
