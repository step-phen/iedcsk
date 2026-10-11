import { ordinal } from "@/hooks/useSpeech";

export const ASSETS = {
  background: "/images/background-images/color-hunt-bg.jpg",
};

// Every color an object can have; the DB only says which one is the target of a round.
export const COLORS = {
  red: { name: "RED", light: "#FF8A6B", dark: "#E63946" },
  blue: { name: "BLUE", light: "#8CACF5", dark: "#3E5FC4" },
  yellow: { name: "YELLOW", light: "#FFE29A", dark: "#F5B942" },
  green: { name: "GREEN", light: "#8FDD9A", dark: "#43A047" },
  orange: { name: "ORANGE", light: "#FFC08A", dark: "#F2994A" },
  purple: { name: "PURPLE", light: "#C6A8FF", dark: "#8E6FE0" },
} as const;

export type ColorKey = keyof typeof COLORS;

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const SHAPES = ["ball", "block", "star", "balloon", "car", "flower"] as const;

export type ShapeKey = (typeof SHAPES)[number];

/** The picture for one object, e.g. "/images/activities/color-hunt/star-blue.webp". */
export const objectImage = (shape: ShapeKey, color: ColorKey) => `/images/activities/color-hunt/${shape}-${color}.webp`;

// Objects of the target color in a round, and how many taps the child gets to find them.
export const CORRECT_COUNT = 3;
export const MAX_ATTEMPTS = 3;

// Every round shows the same number of objects, the target-colored ones among decoys.
export const OBJECTS_PER_ROUND = 6;

// The shortest time the result stays on screen; the next round comes once the spoken result has also finished.
export const FOUND_PAUSE_MS = 2000;
export const MISSED_PAUSE_MS = 3000;

export function isColorKey(value: unknown): value is ColorKey {
  return typeof value === "string" && (COLOR_KEYS as string[]).includes(value);
}

/** What the screen says about the target color, in capitals like the swatch. */
export const instructionText = (color: ColorKey) => `Find the ${COLORS[color].name} objects!`;

/** The question for round number `index` (0-based), led in by "Now let's do the 2nd round" so it does not start abruptly. */
export function questionSpeech(index: number, total: number, color: ColorKey): string {
  const prompt = `Find the ${COLORS[color].name.toLowerCase()} objects!`;
  if (index === 0) return prompt;
  const lead = index === total - 1 ? "Okay, for the last round." : `Now let's do the ${ordinal(index + 1)} round.`;
  return `${lead} ${prompt}`;
}

/** Said when the child taps a right object; `found` is how many they have so far, so the lines vary. */
export function correctTapSpeech(color: ColorKey, found: number): string {
  const name = COLORS[color].name.toLowerCase();
  return [`Yes, that's ${name}!`, `Good eye! That's ${name}!`, `You found it! ${name}!`][(found - 1) % 3];
}

/** Said when the child taps an object of another color. */
export const wrongTapSpeech = (color: ColorKey) => `That's not ${COLORS[color].name.toLowerCase()}.`;

/** Said when a round is missed, pointing out the right ones; `wrongTap` adds the wrong-tap line when the last pick was wrong. */
export function missedSpeech(color: ColorKey, wrongTap: boolean): string {
  const lead = wrongTap ? `${wrongTapSpeech(color)} ` : "";
  return `${lead}These are the ${COLORS[color].name.toLowerCase()} objects.`;
}

/** The feedback shown and said after a round; a miss is encouraged, never scolded. */
export function feedbackText(found: boolean): string {
  return found ? "Great job!" : "Good try!";
}

export function resultSpeech(stars: number, total: number): string {
  const head = stars === total ? "Wow, you found them all!" : stars >= Math.ceil(total * 0.6) ? "Great job!" : "Good try! Let's practice more.";
  return `${head} You got ${stars} out of ${total}.`;
}
