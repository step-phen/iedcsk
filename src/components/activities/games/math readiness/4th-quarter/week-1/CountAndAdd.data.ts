// Garden things and spoken lines for Count and Add; every object is a plain emoji, no image assets to ship.

export const OBJECTS: Record<string, { name: string; plural: string; emoji: string }> = {
  ladybug: { name: "ladybug", plural: "ladybugs", emoji: "🐞" },
  apple: { name: "apple", plural: "apples", emoji: "🍎" },
  flower: { name: "flower", plural: "flowers", emoji: "🌼" },
  leaf: { name: "leaf", plural: "leaves", emoji: "🍀" },
  acorn: { name: "acorn", plural: "acorns", emoji: "🌰" },
};

export function isObject(value: unknown): value is keyof typeof OBJECTS {
  return typeof value === "string" && value in OBJECTS;
}

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Count both baskets, then tap the total!";

export function promptSpeech(plural: string): string {
  return `Count the ${plural} in both baskets, then tap the number that shows how many there are in all.`;
}

export function correctSpeech(total: number, plural: string): string {
  return `Yes! There are ${total} ${plural} in all!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(total: number, plural: string): string {
  return `This is the correct answer! There are ${total} ${plural} in all.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You added ${score} out of ${total} baskets correctly.`;
}
