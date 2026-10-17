// Every capital letter taught in Quarter 2, with the strokes from its own Trails game and how the pencil's moves are said aloud; shared by the review games.

import type { Point } from "../../1st-quarter/week-4/TracePad";
import { T_STROKES } from "../week-1/LetterTTrails.data";
import { L_STROKES } from "../week-1/LetterLTrails.data";
import { I_STROKES } from "../week-2/LetterITrails.data";
import { H_STROKES } from "../week-2/LetterHTrails.data";
import { F_STROKES } from "../week-2/LetterFTrails.data";
import { E_STROKES } from "../week-3/LetterETrails.data";
import { V_STROKES } from "../week-3/LetterVTrails.data";
import { X_STROKES } from "../week-3/LetterXTrails.data";
import { W_STROKES } from "../week-4/LetterWTrails.data";
import { B_STROKES } from "../week-4/LetterBTrails.data";
import { C_STROKES } from "../week-5/LetterCTrails.data";
import { A_STROKES } from "../week-5/LetterATrails.data";
import { M_STROKES } from "../week-5/LetterMTrails.data";
import { N_STROKES } from "../week-6/LetterNTrails.data";
import { K_STROKES } from "../week-6/LetterKTrails.data";
import { Y_STROKES } from "../week-6/LetterYTrails.data";
import { Z_STROKES } from "./LetterZTrails.data";

// Every taught letter is drawn on the same 500 board between these lines.
export const VIEW = 500;
export const TOP_Y = 80;
export const MID_Y = 250;
export const BASE_Y = 420;

export const CAPITALS: Record<string, { strokes: Point[][]; cue: string }> = {
  T: { strokes: T_STROKES, cue: "Across the top, then a long line down the middle." },
  L: { strokes: L_STROKES, cue: "A long line down, then across the bottom." },
  I: { strokes: I_STROKES, cue: "A long line down, then across the top, then across the bottom." },
  H: { strokes: H_STROKES, cue: "Line down, another line down, then across the middle." },
  F: { strokes: F_STROKES, cue: "A long line down, across the top, then a short line across the middle." },
  E: { strokes: E_STROKES, cue: "A long line down, then across the top, the middle, and the bottom." },
  V: { strokes: V_STROKES, cue: "Slant down, then slant up." },
  X: { strokes: X_STROKES, cue: "Slant down one way, then slant down the other way." },
  W: { strokes: W_STROKES, cue: "Slant down, up, down, up." },
  B: { strokes: B_STROKES, cue: "A long line down, a small bump, then a big bump." },
  C: { strokes: C_STROKES, cue: "Start near the top and curve all the way around." },
  A: { strokes: A_STROKES, cue: "Slant down, slant down, then a line across the middle." },
  M: { strokes: M_STROKES, cue: "Line down, then slant down, slant up, and line down." },
  N: { strokes: N_STROKES, cue: "Line down, slant down, then line up." },
  K: { strokes: K_STROKES, cue: "Line down, then slant in and slant out." },
  Y: { strokes: Y_STROKES, cue: "Slant down, slant down to meet it, then a line down." },
  Z: { strokes: Z_STROKES, cue: "Across the top, slant down, then across the bottom." },
};

export const isCapital = (value: unknown): value is string => typeof value === "string" && value in CAPITALS;
