// Snacks, hungry animals and spoken lines for Big or Small?; snacks are emoji, so there are no image assets to ship.

export type Size = "big" | "small";

export function isSize(value: unknown): value is Size {
  return value === "big" || value === "small";
}

export const SNACKS: Record<string, { name: string; emoji: string }> = {
  apple: { name: "apple", emoji: "🍎" },
  cheese: { name: "cheese", emoji: "🧀" },
  banana: { name: "banana", emoji: "🍌" },
  cookie: { name: "cookie", emoji: "🍪" },
  strawberry: { name: "strawberry", emoji: "🍓" },
};

export function isSnack(value: unknown): value is keyof typeof SNACKS {
  return typeof value === "string" && value in SNACKS;
}

/** A big animal always asks for the big snack and a small animal for the small one, so the asker hints the size. */
export const EATERS: Record<Size, { name: string; emoji: string }> = {
  big: { name: "elephant", emoji: "🐘" },
  small: { name: "mouse", emoji: "🐭" },
};

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export function instruction(ask: Size, snack: string): string {
  return `Tap the ${ask} ${SNACKS[snack].name}!`;
}

export function promptSpeech(ask: Size, snack: string): string {
  return `The ${EATERS[ask].name} is hungry! Tap the ${ask} ${SNACKS[snack].name}.`;
}

export function correctSpeech(ask: Size, snack: string): string {
  return `Yum! That is the ${ask} ${SNACKS[snack].name}!`;
}

export function revealSpeech(ask: Size, snack: string): string {
  return `Oops! This one is the ${ask} ${SNACKS[snack].name}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You fed ${score} out of ${total} hungry friends.`;
}
