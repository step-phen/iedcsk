import { ordinal } from "@/hooks/useSpeech";

export const ASSETS = {
  background: "/images/background-images/lines-bg.webp",
  title: "/images/activities/lines/lines-title-banner.webp",
};

// Each line is drawn on the tracing board from the shapes below, in 0..1 coordinates of the tracing area.
export interface Point {
  x: number;
  y: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function zigzagPoint(t: number): Point {
  const verts = [
    { x: 0.1, y: 0.82 },
    { x: 0.32, y: 0.2 },
    { x: 0.5, y: 0.82 },
    { x: 0.7, y: 0.2 },
    { x: 0.9, y: 0.82 },
  ];
  const segT = t * (verts.length - 1);
  const i = Math.min(Math.floor(segT), verts.length - 2);
  const localT = segT - i;
  return { x: lerp(verts[i].x, verts[i + 1].x, localT), y: lerp(verts[i].y, verts[i + 1].y, localT) };
}

/** Each line the DB can name ({"line": "zigzag"}): its spoken name, the instruction, and the path from the green dot (t = 0) to the orange star (t = 1). */
export const LINES: Record<string, { name: string; instruction: string; at: (t: number) => Point }> = {
  horizontal: {
    name: "horizontal line",
    instruction: "Trace the straight line, left to right.",
    at: (t) => ({ x: lerp(0.08, 0.92, t), y: 0.5 }),
  },
  vertical: {
    name: "vertical line",
    instruction: "Trace the straight line, top to bottom.",
    at: (t) => ({ x: 0.5, y: lerp(0.14, 0.86, t) }),
  },
  diagonal: {
    name: "slanted line",
    instruction: "Trace the slanted line.",
    at: (t) => ({ x: lerp(0.14, 0.86, t), y: lerp(0.82, 0.18, t) }),
  },
  zigzag: {
    name: "zigzag line",
    instruction: "Trace the zigzag line.",
    at: zigzagPoint,
  },
  curvy: {
    name: "curvy line",
    instruction: "Trace the curvy line.",
    at: (t) => ({ x: lerp(0.1, 0.9, t), y: 0.5 + 0.22 * Math.sin(t * Math.PI * 2) }),
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
  return `${LINES[line].instruction} Start at the green dot and stop at the orange star.`;
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
  if (clean) return `${opener} You get one star!`;
  return `${opener} Watch, this is how the ${LINES[line].name} goes, from the green dot to the orange star.`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You traced ${score} out of ${total} lines neatly.`;
}
