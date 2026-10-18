// Every capital and small letter taught in Quarter 3, with the strokes from its own Trails game and how the pencil's moves are said aloud; shared by the review games.

import type { Point } from "../../1st-quarter/week-4/TracePad";
import { D_STROKES } from "../week-1/LetterDTrails.data";
import { O_STROKES } from "../week-1/LetterOTrails.data";
import { P_STROKES } from "../week-1/LetterPTrails.data";
import { U_STROKES } from "../week-2/LetterUTrails.data";
import { G_STROKES } from "../week-2/LetterGTrails.data";
import { J_STROKES } from "../week-2/LetterJTrails.data";
import { R_STROKES } from "../week-3/LetterRTrails.data";
import { S_STROKES } from "../week-3/LetterSTrails.data";
import { Q_STROKES } from "../week-3/LetterQTrails.data";
import { STROKES as SMALL_B_STROKES } from "../week-4/LowercaseBTrails.data";
import { STROKES as SMALL_D_STROKES } from "../week-4/LowercaseDTrails.data";
import { STROKES as SMALL_H_STROKES } from "../week-5/LowercaseHTrails.data";
import { STROKES as SMALL_T_STROKES } from "../week-5/LowercaseTTrails.data";
import { STROKES as SMALL_L_STROKES } from "../week-5/LowercaseLTrails.data";
import { STROKES as SMALL_I_STROKES } from "../week-6/LowercaseITrails.data";
import { STROKES as SMALL_F_STROKES } from "../week-6/LowercaseFTrails.data";
import { STROKES as SMALL_M_STROKES } from "../week-6/LowercaseMTrails.data";
import { STROKES as SMALL_N_STROKES } from "./LowercaseNTrails.data";

export const VIEW = 500;
// Capitals sit between a top and base line; small letters use the four-line paper from their own games.
export const CAPITAL_LINES = { top: 80, mid: 250, base: 420 };
export const SMALL_LINES = { top: 60, mid: 170, base: 300, tail: 430 };

// Keyed by the seeder's question_data.letter (case matters: "b" is the small letter): the strokes, how the pencil's moves are said aloud, and whether it is a small letter.
export const LETTERS: Record<string, { strokes: Point[][]; cue: string; small?: boolean }> = {
  D: { strokes: D_STROKES, cue: "Straight down, then back to the top and a big curve around to the bottom." },
  O: { strokes: O_STROKES, cue: "Start at the top and go all the way around." },
  P: { strokes: P_STROKES, cue: "Straight down, then back to the top and a small curve around to the middle." },
  U: { strokes: U_STROKES, cue: "Start at the top, go down, curve around the bottom, and go back up." },
  G: { strokes: G_STROKES, cue: "Make a big C, go up a little, then a short line in." },
  J: { strokes: J_STROKES, cue: "A big line down with a hook at the bottom, then a line across the top." },
  R: { strokes: R_STROKES, cue: "A big line down, then back to the top for a little curve, then a slant down." },
  S: { strokes: S_STROKES, cue: "Curve back like a little c, then curve around the other way." },
  Q: { strokes: Q_STROKES, cue: "Go all the way around like an O, then add a little slant for the tail." },
  b: { strokes: SMALL_B_STROKES, cue: "A tall line down, then back up to the middle for a curve around.", small: true },
  d: { strokes: SMALL_D_STROKES, cue: "Circle back all the way around, then a tall line straight down.", small: true },
  h: { strokes: SMALL_H_STROKES, cue: "A tall line down, then back up for a hump over and down.", small: true },
  t: { strokes: SMALL_T_STROKES, cue: "A tall line down, then a short line across.", small: true },
  l: { strokes: SMALL_L_STROKES, cue: "One tall line straight down.", small: true },
  i: { strokes: SMALL_I_STROKES, cue: "A short line down, then a dot on top.", small: true },
  f: { strokes: SMALL_F_STROKES, cue: "A curve over the top and down, then a short line across.", small: true },
  m: { strokes: SMALL_M_STROKES, cue: "A short line down, then two humps over and down.", small: true },
  n: { strokes: SMALL_N_STROKES, cue: "A short line down, then a hump over and down.", small: true },
};

export const isLetter = (value: unknown): value is string => typeof value === "string" && value in LETTERS;

export const letterName = (letter: string) => `${LETTERS[letter].small ? "small" : "capital"} ${letter}`;
