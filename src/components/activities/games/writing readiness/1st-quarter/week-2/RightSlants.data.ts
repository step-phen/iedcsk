import { ordinal } from "@/hooks/useSpeech";

export const ASSETS = {
  background: "/images/activities/right-slants/right-slants-bg.webp",
};

// Each slant is drawn on the tracing board from the shapes below, in 0..1 coordinates of the tracing area.
export interface Point {
  x: number;
  y: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// The writing lines across the board, as on handwriting paper: blue top line, red dashed middle line, blue bottom line.
export const RULES = { top: 0.15, middle: 0.5, bottom: 0.85 };

/** Each slant the DB can name ({"line": "tall"}): the word the child listens for, which writing lines it joins, where the direction arrows sit, and the path from the green dot (t = 0) to the orange star (t = 1). */
export const LINES: Record<string, { kind: string; path: string; arrows: number[]; at: (t: number) => Point }> = {
  tall: {
    kind: "tall",
    path: "from the top line to the bottom line",
    arrows: [0.3, 0.7],
    at: (t) => ({ x: lerp(0.57, 0.43, t), y: lerp(RULES.top, RULES.bottom, t) }),
  },
  "short-top": {
    kind: "short",
    path: "from the top line to the middle line",
    arrows: [0.5],
    at: (t) => ({ x: lerp(0.535, 0.465, t), y: lerp(RULES.top, RULES.middle, t) }),
  },
  "short-bottom": {
    kind: "short",
    path: "from the middle line to the bottom line",
    arrows: [0.5],
    at: (t) => ({ x: lerp(0.535, 0.465, t), y: lerp(RULES.middle, RULES.bottom, t) }),
  },
  wide: {
    kind: "wide",
    path: "from the top line to the bottom line",
    arrows: [0.3, 0.7],
    at: (t) => ({ x: lerp(0.68, 0.32, t), y: lerp(RULES.top, RULES.bottom, t) }),
  },
  // The tall slant again, written further along the lines as the next letter stroke would be.
  "tall-right": {
    kind: "tall",
    path: "from the top line to the bottom line",
    arrows: [0.3, 0.7],
    at: (t) => ({ x: lerp(0.79, 0.65, t), y: lerp(RULES.top, RULES.bottom, t) }),
  },
};

// Board colors: the writing lines, the dashed guide and its direction arrows, the start dot and end star, the child's on-path and off-path ink, and the answer shown after a miss.
export const COLORS = {
  rule: "#8FB4EF",
  middleRule: "#F2A0A0",
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
  const { kind, path } = LINES[line];
  return `Trace the ${kind} right slant, ${path}. Start at the green dot and stop at the orange star.`;
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
  return `${opener} Watch, this is how the ${LINES[line].kind} right slant goes, from the green dot to the orange star.`;
}

/** Encouraging at every tier; a kindergarten score screen never scolds. */
export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You traced ${score} out of ${total} right slants neatly.`;
}
