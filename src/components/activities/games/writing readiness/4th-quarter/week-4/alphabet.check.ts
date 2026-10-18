// Self-check for the shared alphabet and name letters; run with: npx tsx "src/components/activities/games/writing readiness/4th-quarter/week-4/alphabet.check.ts"

import assert from "node:assert/strict";
import { strokesCovered } from "../../2nd-quarter/week-1/LetterTracePad";
import { letter, nameLetters } from "./alphabet";

let seed = 13;
const wobble = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 12;
const drawn = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x + wobble(), y: p.y + wobble() }));

// Every letter has strokes that stay on the board and pass when followed in order.
for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz") {
  const { strokes } = letter(ch);
  assert.ok(strokes.length > 0, ch);
  for (const p of strokes.flat()) assert.ok(p.x > 0 && p.x < 500 && p.y > 0 && p.y < 500, `${ch} leaves the board`);
  strokes.forEach((s, i) => assert.ok(strokesCovered(drawn(s), strokes, i) >= 1, `${ch} stroke ${i + 1}`));
}

assert.deepEqual(nameLetters("maria clara").map((l) => l.char).join(""), "Maria");
assert.deepEqual(nameLetters("Niño").map((l) => l.char).join(""), "Nino");
assert.deepEqual(nameLetters("JUAN-PAULO").map((l) => l.char).join(""), "Juanpaulo");
assert.deepEqual(nameLetters(null).map((l) => l.char).join(""), "Name");
assert.equal(nameLetters("ana")[0].small, false);

console.log("alphabet.check: ok");
