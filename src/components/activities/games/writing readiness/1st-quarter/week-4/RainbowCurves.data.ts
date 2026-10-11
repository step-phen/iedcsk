// Board geometry, stripe colours and spoken lines for Rainbow Curves; the greeting and intro stay in lib/speech-lines.ts.

import { samplePath, type Point } from "./TracePad";

export const VIEW_W = 800;
export const VIEW_H = 420;
const CX = 400;
export const BASE_Y = 385;
// Each stripe is one overcurve: an arch from its left foot, over the top, down to its right foot.
const OUTER_R = 320;
const STEP_R = 48;
export const STRIPE_W = 38;

export const STRIPES = {
  red: { name: "red", color: "#ff5a5a" },
  orange: { name: "orange", color: "#ff9f40" },
  yellow: { name: "yellow", color: "#ffd23f" },
  green: { name: "green", color: "#4cc36b" },
  blue: { name: "blue", color: "#4a8ff0" },
} as const;

export type StripeKey = keyof typeof STRIPES;

export const isStripe = (value: string): value is StripeKey => value in STRIPES;

/** The arch for the stripe at a place in the rainbow, outermost first, traced left to right. */
export function archPath(place: number): Point[] {
  const r = OUTER_R - STEP_R * place;
  return samplePath((t) => ({ x: CX - r * Math.cos(Math.PI * t), y: BASE_Y - r * Math.sin(Math.PI * t) }));
}

export const INSTRUCTION = "Trace the arch from the green dot to the star!";

export const DONE_TEXT = "You painted a whole rainbow!";

export function promptSpeech(stripe: StripeKey): string {
  return `Trace the ${STRIPES[stripe].name} arch. Start at the green dot, go up and over, and down to the star!`;
}

export function rightSpeech(stripe: StripeKey): string {
  return `That's correct! What a beautiful ${STRIPES[stripe].name} stripe!`;
}

export const WRONG = "Oops! Watch the pencil trace the arch.";

export const REVEAL = "Like this! Up, over the hill, and down.";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
