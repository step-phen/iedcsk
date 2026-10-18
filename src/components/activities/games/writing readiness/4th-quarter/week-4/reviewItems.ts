// The kinds of thing a Quarter 4 review or assessment round asks for (a letter, a numeral, or the child's own name) and the glyphs each one traces; shared by Writing Skills Review 4 and the Week 7 games.

import { letter, letterGlyph, type Letter } from "./alphabet";
import { numeralStrokes, VIEW_W, VIEW_H } from "./NumberTrails.data";
import type { Glyph } from "./useTraceRounds";

export { TOP_Y as NUMERAL_TOP, MID_Y as NUMERAL_MID, BASE_Y as NUMERAL_BASE } from "./NumberTrails.data";

// The seeder's question_data for one round; a letter's case says whether it is the capital or the small one.
export type Item = { kind: "letter"; letter: string } | { kind: "number"; number: number } | { kind: "name"; mode: "trace" | "copy" };

export function isItem(value: unknown): value is Item {
  const v = (value ?? {}) as Record<string, unknown>;
  if (v.kind === "letter") return typeof v.letter === "string" && /^[A-Za-z]$/.test(v.letter);
  if (v.kind === "number") return Number.isInteger(v.number) && (v.number as number) >= 1 && (v.number as number) <= 10;
  return v.kind === "name" && (v.mode === "trace" || v.mode === "copy");
}

export const numberGlyph = (n: number): Glyph => ({ say: `the number ${n}`, strokes: numeralStrokes([n]), viewW: VIEW_W, viewH: VIEW_H, lines: "numeral" });

/** What the round traces: one letter or numeral, or every letter of the name in turn. */
export function itemGlyphs(item: Item, name: Letter[]): Glyph[] {
  if (item.kind === "letter") return [letterGlyph(letter(item.letter))];
  if (item.kind === "number") return [numberGlyph(item.number)];
  return name.map(letterGlyph);
}

/** What a finished round shows on its prize. */
export const itemFace = (item: Item, name: Letter[]) => (item.kind === "letter" ? item.letter : item.kind === "number" ? String(item.number) : name[0].char);

/** How a single letter or numeral is praised, such as "small g" or "5". */
export const itemShort = (item: Item, glyph: Glyph) => (item.kind === "number" ? String(item.number) : glyph.say);
