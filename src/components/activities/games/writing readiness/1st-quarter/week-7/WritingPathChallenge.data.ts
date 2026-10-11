// Race-track paths and spoken lines for Writing Path Challenge; each track joins the straight, slanting and curved strokes already taught.

import type { Point } from "../week-4/TracePad";

export const VIEW_W = 800;
export const VIEW_H = 400;

const line = (a: Point, b: Point): Point[] => Array.from({ length: 21 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 20, y: a.y + ((b.y - a.y) * i) / 20 }));

// An overcurve (a hill, depth below 0) or undercurve (a bowl, depth above 0) from a to b.
const curve = (a: Point, b: Point, depth: number): Point[] =>
  Array.from({ length: 31 }, (_, i) => {
    const t = i / 30;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + depth * Math.sin(Math.PI * t) };
  });

/** Joins the parts of a track and spaces its points evenly, so every part gets its share of the checks. */
function track(...parts: Point[][]): Point[] {
  const pts = parts.flatMap((p, i) => (i ? p.slice(1) : p));
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = lens.reduce((a, b) => a + b, 0);
  const samples = Math.round(total / 10);
  return Array.from({ length: samples }, (_, k) => {
    let d = (total * k) / (samples - 1);
    let i = 0;
    while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
    const f = lens[i] ? Math.min(d / lens[i], 1) : 0;
    return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
  });
}

// Keyed by the seeder's ids: what each track is made of, read out before the child traces it.
export const ITEMS = {
  "track-1": { parts: "a straight line, a slant down, and a straight line", path: track(line({ x: 80, y: 130 }, { x: 300, y: 130 }), line({ x: 300, y: 130 }, { x: 450, y: 300 }), line({ x: 450, y: 300 }, { x: 720, y: 300 })) },
  "track-2": { parts: "a hill curve and a straight line", path: track(curve({ x: 80, y: 300 }, { x: 400, y: 300 }, -200), line({ x: 400, y: 300 }, { x: 720, y: 300 })) },
  "track-3": { parts: "a straight line, a bowl curve, and a slant down", path: track(line({ x: 80, y: 110 }, { x: 250, y: 110 }), curve({ x: 250, y: 110 }, { x: 520, y: 110 }, 180), line({ x: 520, y: 110 }, { x: 720, y: 310 })) },
  "track-4": { parts: "a slant up, a hill curve, and a slant down", path: track(line({ x: 80, y: 320 }, { x: 230, y: 210 }), curve({ x: 230, y: 210 }, { x: 540, y: 210 }, -150), line({ x: 540, y: 210 }, { x: 720, y: 330 })) },
  "track-5": { parts: "a hill curve, a bowl curve, and a straight line", path: track(curve({ x: 80, y: 210 }, { x: 290, y: 210 }, -130), curve({ x: 290, y: 210 }, { x: 500, y: 210 }, 130), line({ x: 500, y: 210 }, { x: 720, y: 210 })) },
};

export type ItemKey = keyof typeof ITEMS;

export const isItem = (value: string): value is ItemKey => value in ITEMS;

export const INSTRUCTION = "Trace the whole race track to the flag!";

export const DONE_TEXT = "You won every race!";

export function promptSpeech(item: ItemKey): string {
  return `This race track has ${ITEMS[item].parts}. Trace it from the green dot all the way to the star!`;
}

export const RIGHT = "That's correct! Vroom! The race car made it to the flag!";

export const WRONG = "Oops! Watch the pencil follow the whole track.";

export const REVEAL = "Like this! Every line and every curve.";

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
