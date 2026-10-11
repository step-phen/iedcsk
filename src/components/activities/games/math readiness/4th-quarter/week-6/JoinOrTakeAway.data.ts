// Story objects and spoken lines for Join or Take Away?; objects are emoji and the counters are chalk circles drawn with CSS.

export type Action = "join" | "takeAway";

export const OBJECTS: Record<string, { emoji: string; first: (n: number) => string; join: (n: number) => string; away: (n: number) => string }> = {
  duck: { emoji: "🦆", first: (n) => `${n} ducks swim in the pond.`, join: (n) => `${n} more ducks come to swim.`, away: (n) => `${n} ducks swim away.` },
  bird: { emoji: "🐦", first: (n) => `${n} birds sit on a fence.`, join: (n) => `${n} more birds land on the fence.`, away: (n) => `${n} birds fly away.` },
  apple: { emoji: "🍎", first: (n) => `Mama has ${n} apples.`, join: (n) => `She buys ${n} more apples.`, away: (n) => `She gives away ${n} apples.` },
  cookie: { emoji: "🍪", first: (n) => `There are ${n} cookies on a plate.`, join: (n) => `Lola bakes ${n} more cookies.`, away: (n) => `We eat ${n} cookies.` },
  balloon: { emoji: "🎈", first: (n) => `There are ${n} balloons at the party.`, join: (n) => `${n} more balloons are blown up.`, away: (n) => `${n} balloons pop!` },
};

export const isObject = (v: unknown): v is keyof typeof OBJECTS => typeof v === "string" && v in OBJECTS;

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Join or take away?";
export const QUESTION = "Do we join, or do we take away? Tap Join or Take Away.";
export const REVEAL_TEXT = "This is the correct answer!";

export const ACTION_LABEL: Record<Action, { text: string; icon: string }> = {
  join: { text: "Join", icon: "➕" },
  takeAway: { text: "Take Away", icon: "➖" },
};

const why = (action: Action) => (action === "join" ? "More came, so we join." : "Some went away, so we take away.");

export function correctSpeech(action: Action): string {
  return `Yes! ${why(action)}`;
}

export function revealSpeech(action: Action): string {
  return `This is the correct answer! ${why(action)}`;
}

export function equation(action: Action, start: number, change: number): string {
  return action === "join" ? `${start} + ${change} = ${start + change}` : `${start} − ${change} = ${start - change}`;
}

export function modelSpeech(action: Action, start: number, change: number): string {
  return action === "join" ? `${start} and ${change} more make ${start + change}.` : `${start} take away ${change} leaves ${start - change}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You chose join or take away correctly ${score} out of ${total} times.`;
}
