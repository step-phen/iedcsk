import { ordinal } from "@/hooks/useSpeech";

export const ASSETS = {
  background: "/images/background-images/long-and-short-straight-lines-bg.webp",
};

// Each line is drawn on the tracing board from the shapes below, in 0..1 coordinates of the tracing area.
export interface Point {
  x: number;
  y: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Size = "long" | "short";

/** Each line the DB can name ({"line": "long-horizontal"}): its size, which way it goes, where the direction arrows sit, and the path from the green dot (t = 0) to the orange star (t = 1). */
export const LINES: Record<string, { size: Size; direction: string; arrows: number[]; at: (t: number) => Point }> = {
  "long-horizontal": {
    size: "long",
    direction: "left to right",
    arrows: [0.25, 0.5, 0.75],
    at: (t) => ({ x: lerp(0.08, 0.92, t), y: 0.5 }),
  },
  "short-horizontal": {
    size: "short",
    direction: "left to right",
    arrows: [0.5],
    at: (t) => ({ x: lerp(0.38, 0.62, t), y: 0.5 }),
  },
  "long-vertical": {
    size: "long",
    direction: "top to bottom",
    arrows: [0.25, 0.5, 0.75],
    at: (t) => ({ x: 0.5, y: lerp(0.1, 0.9, t) }),
  },
  "short-vertical": {
    size: "short",
    direction: "top to bottom",
    arrows: [0.5],
    at: (t) => ({ x: 0.5, y: lerp(0.32, 0.68, t) }),
  },
  // A long line again, lower on the board, so the rounds go long, short, long, short, long.
  "long-horizontal-low": {
    size: "long",
    direction: "left to right",
    arrows: [0.25, 0.5, 0.75],
    at: (t) => ({ x: lerp(0.08, 0.92, t), y: 0.72 }),
  },
};

// Board colors: the dashed guide and its direction arrows, the start dot and end star, the child's on-path and off-path ink, and the answer shown after a miss.
export const COLORS = {
  guide: "#AFC0D8",
  arrow: "#BCD0EC",
  start: "#3CB878",
  end: "#F6B73C",
  outline: "#1B355E",
  onPath: "#3CB878",
  offPath: "#E4572E",
  answer: "#2C9660",
};

export function roundPrompt(line: string): string {
  const { size, direction } = LINES[line];
  return `Trace the ${size} line, from ${direction}. Start at the green dot and stop at the orange star.`;
}

export function firstRoundSpeech(prompt: string): string {
  return `The first one is: ${prompt}`;
}

/** Lead-in for every round after the first, so the next prompt doesn't start abruptly. */
export function nextRoundSpeech(roundNumber: number, isLast: boolean, prompt: string): string {
  const transition = isLast
    ? `Okay, for the last and ${ordinal(roundNumber)} one.`
    : `Now let's move to the ${ordinal(roundNumber)} one.`;
  return `${transition} ${prompt}`;
}

// Everything the game says after a trace; the shared greeting and intro stay in lib/speech-lines.ts.
export const SPEECH = {
  clean: ["Nice tracing!", "Great job! You stayed on the line!", "Wow, careful tracing!", "Perfect! Right on the line!"],
  offPath: ["Good try! Some of your line went outside.", "Nice effort! A little of it went off the line.", "Almost! Part of your line went outside."],
};

/** A clean trace earns the star; a messy one is shown the right path while this is spoken. */
export function traceSpeech(line: string, clean: boolean, opener: string): string {
  const { size } = LINES[line];
  if (clean) return `${opener} That is a ${size} line. You get one star!`;
  return `${opener} Watch, this is how the ${size} line goes, from the green dot to the orange star.`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You traced ${score} out of ${total} lines neatly.`;
}
