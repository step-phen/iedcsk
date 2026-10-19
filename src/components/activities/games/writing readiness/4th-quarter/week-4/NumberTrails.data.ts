// Numeral strokes, kite layout and spoken lines for Number Trails; the greeting and intro stay in lib/speech-lines.ts.

import { arc, chain, straight } from "../../2nd-quarter/week-1/LetterTracePad";
import type { Point } from "../../1st-quarter/week-4/TracePad";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VIEW_W = 600;
export const VIEW_H = 440;
// Numerals stand between the top line and the base line, with a dashed middle line between.
export const TOP_Y = 70;
export const MID_Y = 220;
export const BASE_Y = 370;

const H = BASE_Y - TOP_Y;
const W = 150;
const ONE_W = 60;
const DIGIT_GAP = 20;
const NUMBER_GAP = 100;

const P = (x: number, y: number): Point => ({ x, y });
const v = (f: number) => TOP_Y + f * H;
const deg = (d: number) => (d * Math.PI) / 180;
const last = (pts: Point[]) => pts[pts.length - 1];

/** One digit's strokes in its modeled order, drawn in the cell that starts at x0. */
function digitStrokes(d: number, x0: number): Point[][] {
  const cx = x0 + W / 2;
  switch (d) {
    case 1:
      return [straight(P(x0 + ONE_W / 2, TOP_Y), P(x0 + ONE_W / 2, BASE_Y))];
    case 2: {
      const hook = arc(cx, v(0.25), 0.45 * W, 0.25 * H, deg(-150), deg(30));
      return [chain(hook, straight(last(hook), P(x0, BASE_Y)), straight(P(x0, BASE_Y), P(x0 + W, BASE_Y)))];
    }
    case 3:
      return [chain(arc(cx, v(0.25), 0.42 * W, 0.25 * H, deg(-150), deg(90)), arc(cx, v(0.75), 0.47 * W, 0.25 * H, deg(-90), deg(150)))];
    case 4: {
      const x = x0 + 15;
      return [chain(straight(P(x, TOP_Y), P(x, v(0.6))), straight(P(x, v(0.6)), P(x0 + W, v(0.6)))), straight(P(x0 + 0.72 * W, TOP_Y), P(x0 + 0.72 * W, BASE_Y))];
    }
    case 5: {
      const belly = arc(cx, v(0.68), 0.47 * W, 0.32 * H, deg(-160), deg(145));
      const x = belly[0].x;
      return [chain(straight(P(x, TOP_Y), belly[0]), belly), straight(P(x, TOP_Y), P(x0 + W, TOP_Y))];
    }
    case 6:
      return [chain(arc(x0 + 0.95 * W, v(0.72), 0.9 * W, 0.72 * H, deg(-100), deg(-180)), arc(cx, v(0.72), 0.45 * W, 0.28 * H, deg(180), deg(-170)))];
    case 7:
      return [chain(straight(P(x0, TOP_Y), P(x0 + W, TOP_Y)), straight(P(x0 + W, TOP_Y), P(x0 + 0.3 * W, BASE_Y)))];
    case 8: {
      const top = arc(cx, v(0.23), 0.38 * W, 0.23 * H, 0, deg(-270));
      const bottom = arc(cx, v(0.73), 0.46 * W, 0.27 * H, deg(-90), deg(200));
      return [chain(top, bottom, straight(last(bottom), top[0]))];
    }
    case 9:
      return [chain(arc(cx, v(0.25), 0.42 * W, 0.25 * H, 0, -2 * Math.PI), straight(P(cx + 0.42 * W, v(0.25)), P(cx + 0.42 * W, BASE_Y)))];
    case 0:
      return [arc(cx, v(0.5), 0.45 * W, 0.5 * H, -Math.PI / 2, (-5 * Math.PI) / 2, 70)];
    default:
      throw new Error(`No strokes for digit ${d}`);
  }
}

/** Every stroke of the round's numerals, left to right, centred on the board. */
export function numeralStrokes(numbers: number[]): Point[][] {
  const digits = numbers.map((n) => String(n).split("").map(Number));
  const width = (d: number) => (d === 1 ? ONE_W : W);
  const total = digits.reduce((t, ds, i) => t + (i ? NUMBER_GAP : 0) + ds.reduce((s, d, j) => s + (j ? DIGIT_GAP : 0) + width(d), 0), 0);
  let x = (VIEW_W - total) / 2;
  const strokes: Point[][] = [];
  digits.forEach((ds, i) => {
    if (i) x += NUMBER_GAP;
    ds.forEach((d, j) => {
      if (j) x += DIGIT_GAP;
      strokes.push(...digitStrokes(d, x));
      x += width(d);
    });
  });
  return strokes;
}

export const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.length <= 2 && value.every((n) => Number.isInteger(n) && n >= 1 && n <= 10);

const CUES: Record<number, string> = {
  1: "1: a straight line down.",
  2: "2: curve around, slide down, then go across.",
  3: "3: around the top, then around the bottom.",
  4: "4: down and across, then a big line down.",
  5: "5: down and around, then give it a hat.",
  6: "6: curve down, then roll into a loop.",
  7: "7: across the top, then slide down.",
  8: "8: make an S, then go back up.",
  9: "9: make a ball, then a line down.",
  10: "10: a 1, then a 0.",
};

const says = (numbers: number[]) => numbers.join(" and ");
const cues = (numbers: number[]) => numbers.map((n) => CUES[n]).join(" ");

export const INSTRUCTION = "Watch, then trace each number to fly a kite!";

export function promptSpeech(numbers: number[], first: boolean): string {
  return first
    ? `Watch the pencil write ${says(numbers)}. ${cues(numbers)} Now you try! Start at the green dot.`
    : `Watch, then trace ${says(numbers)}. ${cues(numbers)}`;
}

export function correctSpeech(numbers: number[]): string {
  return `Up, up and away! Your ${says(numbers)} kite flies high!`;
}

export const WATCH_AGAIN = "Oops! Watch the pencil closely.";

export const REVEAL = "This is the correct way to write them!";

export function revealSpeech(numbers: number[]): string {
  return `${REVEAL} ${cues(numbers)}`;
}

export const DONE = "Hooray! Every kite is flying! You traced all the numbers from 1 to 10!";

export const DONE_MISSED = "Good try! Keep practicing your numbers, one stroke at a time.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You traced ${score} out of ${total} number pairs correctly.`;
}
