// Object library, color palette and spoken lines for Sort by Color; objects are emoji, no image assets to ship. The shared greeting and intro stay in lib/speech-lines.ts.

export const COLOR_NAMES: Record<string, string> = {
  red: "red",
  blue: "blue",
  green: "green",
  yellow: "yellow",
  purple: "purple",
};

export const COLOR_HEX: Record<string, string> = {
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#FBBF24",
  purple: "#A855F7",
};

export function isColorName(value: unknown): value is keyof typeof COLOR_NAMES {
  return typeof value === "string" && value in COLOR_NAMES;
}

export const OBJECTS: Record<string, { name: string; emoji: string }> = {
  apple: { name: "Apple", emoji: "🍎" },
  banana: { name: "Banana", emoji: "🍌" },
  blueberries: { name: "Blueberries", emoji: "🫐" },
  broccoli: { name: "Broccoli", emoji: "🥦" },
  grapes: { name: "Grapes", emoji: "🍇" },
};

export function isObjectId(value: unknown): value is keyof typeof OBJECTS {
  return typeof value === "string" && value in OBJECTS;
}

export const INSTRUCTION = "Drag the object into the basket with the same color!";

export function promptSpeech(objectId: keyof typeof OBJECTS, color: string): string {
  return `This ${OBJECTS[objectId].name.toLowerCase()} is ${COLOR_NAMES[color]}. Drag it to the ${COLOR_NAMES[color]} basket!`;
}

export const TRY_AGAIN = "Not that basket. Look at the color again!";

export function correctSpeech(color: string): string {
  return `Yes! That basket is ${COLOR_NAMES[color]}!`;
}

export function revealSpeech(color: string): string {
  return `Here it is! This basket is ${COLOR_NAMES[color]}!`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You sorted ${score} out of ${total} objects.`;
}
