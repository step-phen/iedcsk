// Story characters and spoken lines for Add the Story; characters are emoji and each story's scene is a CSS backdrop.

export type Scene = "tree" | "pond" | "meadow" | "river";

export const CHARACTERS: Record<string, { plural: string; emoji: string; scene: Scene; first: (n: number) => string; more: (n: number) => string; question: string }> = {
  bird: {
    plural: "birds",
    emoji: "🐦",
    scene: "tree",
    first: (n) => `${n} birds sat on a branch.`,
    more: (n) => `Then ${n} more birds flew in.`,
    question: "How many birds are on the branch now?",
  },
  duck: {
    plural: "ducks",
    emoji: "🦆",
    scene: "pond",
    first: (n) => `${n} ducks swam in the pond.`,
    more: (n) => `Then ${n} more ducks jumped in.`,
    question: "How many ducks are in the pond now?",
  },
  butterfly: {
    plural: "butterflies",
    emoji: "🦋",
    scene: "meadow",
    first: (n) => `${n} butterflies rested on the flowers.`,
    more: (n) => `Then ${n} more butterflies came.`,
    question: "How many butterflies are there now?",
  },
  fish: {
    plural: "fish",
    emoji: "🐟",
    scene: "river",
    first: (n) => `${n} fish swam in the river.`,
    more: (n) => `Then ${n} more fish swam over.`,
    question: "How many fish are there now?",
  },
  bee: {
    plural: "bees",
    emoji: "🐝",
    scene: "meadow",
    first: (n) => `${n} bees buzzed near the hive.`,
    more: (n) => `Then ${n} more bees joined them.`,
    question: "How many bees are there now?",
  },
};

export const isCharacter = (v: unknown): v is keyof typeof CHARACTERS => typeof v === "string" && v in CHARACTERS;

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LISTEN_TEXT = "Listen to the story…";
export const PICK_TEXT = "How many in all?";
export const REVEAL_TEXT = "This is the correct answer!";

export function correctSpeech(first: number, more: number, plural: string): string {
  return `Yes! ${first} and ${more} more make ${first + more} ${plural}!`;
}

export function revealSpeech(first: number, more: number, plural: string): string {
  return `This is the correct answer! ${first} and ${more} more make ${first + more} ${plural}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You solved ${score} out of ${total} stories correctly.`;
}
