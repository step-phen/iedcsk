// Sea things and spoken lines for Compare and Choose; size things are emoji, long things are drawn in CompareAndChoose.tsx.

export type SizeAsk = "big" | "small";
export type LengthAsk = "long" | "short";
export type Ask = SizeAsk | LengthAsk;

export const SIZE_THINGS: Record<string, { name: string; emoji: string }> = {
  fish: { name: "fish", emoji: "🐠" },
  crab: { name: "crab", emoji: "🦀" },
  turtle: { name: "turtle", emoji: "🐢" },
  octopus: { name: "octopus", emoji: "🐙" },
  shell: { name: "shell", emoji: "🐚" },
};

export const LENGTH_THINGS = {
  seaweed: { name: "seaweed" },
  rope: { name: "anchor rope" },
} as const;

export type LengthThing = keyof typeof LENGTH_THINGS;

export function isSizeThing(value: unknown): value is keyof typeof SIZE_THINGS {
  return typeof value === "string" && value in SIZE_THINGS;
}

export function isLengthThing(value: unknown): value is LengthThing {
  return typeof value === "string" && value in LENGTH_THINGS;
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

/** The chip above the choices tells the child which kind of comparing this round is. */
export const KIND_CHIP = {
  size: { label: "How big?", icon: "⭕" },
  length: { label: "How long?", icon: "📏" },
} as const;

export function instruction(ask: Ask, name: string): string {
  return `Tap the ${ask} ${name}!`;
}

export function promptSpeech(kind: "size" | "length", ask: Ask, name: string): string {
  return kind === "size" ? `Look at how big they are. Tap the ${ask} ${name}.` : `Look at how long they are. Tap the ${ask} ${name}.`;
}

export function correctSpeech(ask: Ask, name: string): string {
  return `Splash! That ${name} is ${ask}!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(ask: Ask, name: string): string {
  return `This is the correct answer! This ${name} is ${ask}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You chose ${score} out of ${total} sea things correctly.`;
}
