// Every capital and small letter with its modeled strokes, and the learner's first name as a row of them; shared by My Name, Writing Skills Review 4 and the Week 7 review games.

import type { Point } from "../../1st-quarter/week-4/TracePad";
import { CAPITALS } from "../../2nd-quarter/week-7/capitalLetters";
import { LETTERS } from "../../3rd-quarter/week-7/thirdQuarterLetters";
import { STROKES as G } from "../week-1/LowercaseGTrails.data";
import { STROKES as P } from "../week-1/LowercasePTrails.data";
import { STROKES as J } from "../week-1/LowercaseJTrails.data";
import { STROKES as E } from "../week-2/LowercaseETrails.data";
import { STROKES as C } from "../week-2/LowercaseCTrails.data";
import { STROKES as A } from "../week-2/LowercaseATrails.data";
import { STROKES as Q } from "../week-3/LowercaseQTrails.data";
import { STROKES as O } from "../week-3/LowercaseOTrails.data";
import { STROKES as S } from "../week-3/LowercaseSTrails.data";
import { STROKES as R } from "../week-5/LowercaseRTrails.data";
import { STROKES as K } from "../week-5/LowercaseKTrails.data";
import { STROKES as U } from "../week-5/LowercaseUTrails.data";
import { STROKES as V } from "../week-6/LowercaseVTrails.data";
import { STROKES as W } from "../week-6/LowercaseWTrails.data";
import { STROKES as X } from "../week-6/LowercaseXTrails.data";
import { Y_STROKES as Y, Z_STROKES as Z } from "../week-7/LowercaseYZTrails.data";
import type { Glyph } from "./useTraceRounds";

// Both kinds of letter sit on the same 500 board: capitals between a top and base line, small letters on four-line paper.
export const VIEW = 500;
export const CAPITAL_LINES = { top: 80, mid: 250, base: 420 };
export const SMALL_LINES = { top: 60, mid: 170, base: 300, tail: 430 };

const SMALL: Record<string, Point[][]> = {
  ...Object.fromEntries(Object.entries(LETTERS).filter(([, l]) => l.small).map(([k, l]) => [k, l.strokes])),
  g: G, p: P, j: J, e: E, c: C, a: A, q: Q, o: O, s: S, r: R, k: K, u: U, v: V, w: W, x: X, y: Y, z: Z,
};

const CAPITAL: Record<string, Point[][]> = {
  ...Object.fromEntries(Object.entries(CAPITALS).map(([k, l]) => [k, l.strokes])),
  ...Object.fromEntries(Object.entries(LETTERS).filter(([, l]) => !l.small).map(([k, l]) => [k, l.strokes])),
};

export interface Letter {
  char: string;
  small: boolean;
  strokes: Point[][];
}

export function letter(char: string): Letter {
  const small = char === char.toLowerCase();
  const strokes = (small ? SMALL : CAPITAL)[char];
  if (!strokes) throw new Error(`No strokes for letter ${char}`);
  return { char, small, strokes };
}

export const letterName = (l: Letter) => `${l.small ? "small" : "capital"} ${l.char}`;

export const letterGlyph = (l: Letter): Glyph => ({ say: letterName(l), strokes: l.strokes, viewW: VIEW, viewH: VIEW, lines: l.small ? "small" : "capital" });

/** The first word of the learner's first name as plain letters, capital first (Niño becomes Nino); "Name" when no learner is picked. */
export function nameLetters(firstName: string | null): Letter[] {
  const word = (firstName ?? "").normalize("NFD").replace(/[^A-Za-z\s]/g, "").trim().split(/\s+/)[0] || "Name";
  return [...word].map((ch, i) => letter(i === 0 ? ch.toUpperCase() : ch.toLowerCase()));
}
