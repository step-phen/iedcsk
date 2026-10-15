// Skywriting strokes and spoken lines for Meet the Capital Letters; the greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export interface Point {
  x: number;
  y: number;
}

export const VIEW_W = 500;
export const VIEW_H = 420;

const sample = (f: (t: number) => Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
const line = (ax: number, ay: number, bx: number, by: number) => sample((t) => ({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t }));
// Starts at the top and goes left (counterclockwise), the way a C or O is written.
const circle = (cx: number, cy: number, r: number) => sample((t) => ({ x: cx + r * Math.cos(-Math.PI / 2 - 2 * Math.PI * t), y: cy + r * Math.sin(-Math.PI / 2 - 2 * Math.PI * t) }), 90);

// Keyed by the seeder's question_data.target: the strokes the plane writes, in order, and how they are said.
export const LETTERS = {
  T: { strokes: [line(130, 70, 370, 70), line(250, 70, 250, 350)], how: "a line across the top, then a line down the middle" },
  L: { strokes: [line(160, 70, 160, 350), line(160, 350, 350, 350)], how: "a line down, then a line across the bottom" },
  H: { strokes: [line(150, 70, 150, 350), line(350, 70, 350, 350), line(150, 210, 350, 210)], how: "a line down, another line down, then a line across the middle" },
  A: { strokes: [line(250, 70, 130, 350), line(250, 70, 370, 350), line(178, 240, 322, 240)], how: "a slant down, another slant down, then a line across" },
  O: { strokes: [circle(250, 210, 140)], how: "one big circle, all the way around" },
};

export type Target = keyof typeof LETTERS;

export const isTarget = (value: unknown): value is Target => typeof value === "string" && value in LETTERS;

export const INSTRUCTION = "Watch the plane, then tap its letter!";

export function promptSpeech(target: Target): string {
  return `Watch the plane write a capital letter in the sky: ${LETTERS[target].how}. Which letter is it?`;
}

export function correctSpeech(target: Target): string {
  return `Yes! The plane wrote capital ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: Target): string {
  return `${REVEAL} The plane wrote capital ${target}: ${LETTERS[target].how}.`;
}

export const DONE = "Hooray! You knew every letter in the sky!";

export const DONE_MISSED = "Good try! Keep watching how lines and curves make capital letters.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
