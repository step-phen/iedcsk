import { ordinal } from "@/hooks/useSpeech";

export const ASSETS = {
  background: "/images/background-images/shapes-tracing-bg.webp",
};

// Each shape is drawn in the middle square of the tracing board, in 0..1 coordinates of that square.
export interface Point {
  x: number;
  y: number;
}

// The trace stops just short of the green dot, so the orange star sits beside it instead of on top of it.
const LOOP = 0.95;

// A point part of the way around a closed outline, starting at its first corner and going clockwise.
function around(corners: Point[], t: number): Point {
  const edges = corners.map((from, i) => {
    const to = corners[(i + 1) % corners.length];
    return { from, to, len: Math.hypot(to.x - from.x, to.y - from.y) };
  });
  let dist = t * LOOP * edges.reduce((sum, e) => sum + e.len, 0);
  for (const e of edges) {
    if (dist <= e.len) return { x: e.from.x + ((e.to.x - e.from.x) * dist) / e.len, y: e.from.y + ((e.to.y - e.from.y) * dist) / e.len };
    dist -= e.len;
  }
  return corners[0];
}

function starCorners(): Point[] {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 0.42 : 0.18;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    return { x: 0.5 + r * Math.cos(angle), y: 0.53 + r * Math.sin(angle) };
  });
}

const STAR = starCorners();

/** Each shape the DB can name ({"shape": "circle"}): its name, where the direction arrows sit, and the outline from the green dot (t = 0) to the orange star (t = 1). */
export const SHAPES: Record<string, { name: string; arrows: number[]; at: (t: number) => Point }> = {
  circle: {
    name: "circle",
    arrows: [0.125, 0.375, 0.625],
    at: (t) => {
      const angle = -Math.PI / 2 + t * LOOP * Math.PI * 2;
      return { x: 0.5 + 0.4 * Math.cos(angle), y: 0.5 + 0.4 * Math.sin(angle) };
    },
  },
  square: {
    name: "square",
    arrows: [0.13, 0.39, 0.66],
    at: (t) => around([{ x: 0.12, y: 0.12 }, { x: 0.88, y: 0.12 }, { x: 0.88, y: 0.88 }, { x: 0.12, y: 0.88 }], t),
  },
  triangle: {
    name: "triangle",
    arrows: [0.17, 0.5],
    at: (t) => around([{ x: 0.5, y: 0.1 }, { x: 0.9, y: 0.88 }, { x: 0.1, y: 0.88 }], t),
  },
  rectangle: {
    name: "rectangle",
    arrows: [0.18, 0.69],
    at: (t) => around([{ x: 0.04, y: 0.24 }, { x: 0.96, y: 0.24 }, { x: 0.96, y: 0.76 }, { x: 0.04, y: 0.76 }], t),
  },
  star: {
    name: "star",
    arrows: [],
    at: (t) => around(STAR, t),
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

export function roundPrompt(shape: string): string {
  return `Trace the ${SHAPES[shape].name}. Start at the green dot and go all the way around to the orange star.`;
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

/** A clean trace earns the star; a messy one is shown the right outline while this is spoken. */
export function traceSpeech(shape: string, clean: boolean, opener: string): string {
  const { name } = SHAPES[shape];
  if (clean) return `${opener} You traced a ${name}. You get one star!`;
  return `${opener} Watch, this is how we trace the ${name}, all the way around.`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You traced ${score} out of ${total} shapes neatly.`;
}
