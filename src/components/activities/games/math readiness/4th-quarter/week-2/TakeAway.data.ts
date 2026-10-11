// Bakery treats and spoken lines for Take Away; every treat is a plain emoji, no image assets to ship.

export const OBJECTS: Record<string, { name: string; plural: string; emoji: string }> = {
  cookie: { name: "cookie", plural: "cookies", emoji: "🍪" },
  cupcake: { name: "cupcake", plural: "cupcakes", emoji: "🧁" },
  donut: { name: "donut", plural: "donuts", emoji: "🍩" },
  grape: { name: "grape", plural: "grapes", emoji: "🍇" },
  strawberry: { name: "strawberry", plural: "strawberries", emoji: "🍓" },
};

export function isObject(value: unknown): value is keyof typeof OBJECTS {
  return typeof value === "string" && value in OBJECTS;
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export function instruction(removed: number, plural: string): string {
  return `Take away ${removed} ${plural}, then tap how many are left!`;
}

export function promptSpeech(removed: number, plural: string): string {
  return `Take away ${removed} ${plural} from the tray, then tap the number that shows how many are left, even if none remain.`;
}

export function correctSpeech(left: number, plural: string): string {
  return left === 0 ? `Yes! There are no ${plural} left!` : `Yes! There are ${left} ${plural} left!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(left: number, plural: string): string {
  return left === 0 ? `This is the correct answer! There are no ${plural} left.` : `This is the correct answer! There are ${left} ${plural} left.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You took away ${score} out of ${total} trays correctly.`;
}
