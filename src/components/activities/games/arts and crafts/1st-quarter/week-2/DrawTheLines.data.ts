export interface Point {
  x: number;
  y: number;
}

export interface RoundDef {
  title: string;
  d: string;
  start: Point;
}

export type Tier = "gold" | "silver" | "bronze";

export interface RoundResult {
  title: string;
  score: number;
  tier: Tier;
  tierLabel: string;
}

export const INK = "#16215C";
export const GUIDE = "#AFC1EA";
export const TRACE = "#FF6B4A";
export const SUCCESS = "#4CAF63";
export const VIEW_W = 900;
export const VIEW_H = 420;

export const ROUNDS: RoundDef[] = [
  {
    title: "Straight Across",
    d: "M80,210 L820,210",
    start: { x: 80, y: 210 },
  },
  {
    title: "Straight Up and Down",
    d: "M450,50 L450,370",
    start: { x: 450, y: 50 },
  },
  {
    title: "Curvy Line",
    d: "M80,300 C260,60 380,60 460,180 C540,300 660,300 820,120",
    start: { x: 80, y: 300 },
  },
  {
    title: "Zigzag Line",
    d: "M80,320 L230,90 L380,320 L530,90 L680,320 L820,150",
    start: { x: 80, y: 320 },
  },
  {
    title: "Curvy + Zigzag",
    d: "M80,300 C220,120 300,120 380,220 L480,80 L580,220 L680,80 C740,140 780,180 820,140",
    start: { x: 80, y: 300 },
  },
];

export const TIER_COLORS: Record<Tier, string> = {
  gold: "#F5B942",
  silver: "#9AA6C4",
  bronze: "#D97757",
};

export const TOTAL_ROUNDS = ROUNDS.length;
export const SAMPLE_COUNT = 140;
export const TOLERANCE = 55; // generous — small deviations are expected and fine
export const START_TOLERANCE = 75;
export const LOOKAHEAD = 26; // how far forward we search for progress in one move

/** Scores a round from how closely the child's pointer tracked the guide; this game never fails a round, only grades its accuracy. */
export function scoreRound(deviations: number[]): { score: number; tier: Tier; tierLabel: string } {
  const avgDeviation = deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
  const accuracy = Math.max(0, Math.min(1, 1 - avgDeviation / TOLERANCE));
  const score = Math.round(accuracy * 100);

  if (score >= 90) return { score, tier: "gold", tierLabel: "Perfect Line" };
  if (score >= 70) return { score, tier: "silver", tierLabel: "Great Tracing" };
  return { score, tier: "bronze", tierLabel: "Good Job" };
}
