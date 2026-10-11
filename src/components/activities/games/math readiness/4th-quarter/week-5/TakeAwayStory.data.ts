// Puppet show characters and spoken lines for Take-Away Story; characters are emoji and each one leaves the stage its own way.

export type Exit = "fall" | "hop" | "float" | "munch";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const CHARACTERS: Record<string, { plural: string; emoji: string; exit: Exit; start: (n: number) => string; gone: (n: number) => string; tap: (n: number) => string; question: string }> = {
  apple: {
    plural: "apples",
    emoji: "🍎",
    exit: "fall",
    start: (n) => `There were ${n} apples on the tree.`,
    gone: (n) => `${n} ${plural(n, "apple", "apples")} fell down.`,
    tap: (n) => `Tap ${n} ${plural(n, "apple", "apples")} to make ${plural(n, "it", "them")} fall.`,
    question: "How many apples are left on the tree?",
  },
  frog: {
    plural: "frogs",
    emoji: "🐸",
    exit: "hop",
    start: (n) => `${n} frogs sat on a log.`,
    gone: (n) => `${n} ${plural(n, "frog", "frogs")} hopped away.`,
    tap: (n) => `Tap ${n} ${plural(n, "frog", "frogs")} to make ${plural(n, "it", "them")} hop away.`,
    question: "How many frogs are left on the log?",
  },
  balloon: {
    plural: "balloons",
    emoji: "🎈",
    exit: "float",
    start: (n) => `A clown had ${n} balloons.`,
    gone: (n) => `${n} ${plural(n, "balloon", "balloons")} flew away.`,
    tap: (n) => `Tap ${n} ${plural(n, "balloon", "balloons")} to let ${plural(n, "it", "them")} fly away.`,
    question: "How many balloons are left?",
  },
  cookie: {
    plural: "cookies",
    emoji: "🍪",
    exit: "munch",
    start: (n) => `There were ${n} cookies on the plate.`,
    gone: (n) => `${n} ${plural(n, "cookie was", "cookies were")} eaten.`,
    tap: (n) => `Tap ${n} ${plural(n, "cookie", "cookies")} to eat ${plural(n, "it", "them")}.`,
    question: "How many cookies are left on the plate?",
  },
  bunny: {
    plural: "bunnies",
    emoji: "🐰",
    exit: "hop",
    start: (n) => `${n} bunnies played in the garden.`,
    gone: (n) => `${n} ${plural(n, "bunny", "bunnies")} hopped home.`,
    tap: (n) => `Tap ${n} ${plural(n, "bunny", "bunnies")} to send ${plural(n, "it", "them")} home.`,
    question: "How many bunnies are left in the garden?",
  },
};

export const isCharacter = (v: unknown): v is keyof typeof CHARACTERS => typeof v === "string" && v in CHARACTERS;

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const LISTEN_TEXT = "Listen to the story…";
export const PICK_TEXT = "How many are left?";
export const REVEAL_TEXT = "This is the correct answer!";

export function tapText(n: number): string {
  return `Tap ${n} to take away!`;
}

export function correctSpeech(left: number, pluralName: string): string {
  return left === 0 ? `Yes! There are no ${pluralName} left. That is zero!` : `Yes! There ${left === 1 ? "is" : "are"} ${left} left!`;
}

export function revealSpeech(left: number, pluralName: string): string {
  return left === 0 ? `This is the correct answer! There are no ${pluralName} left, so the answer is zero.` : `This is the correct answer! There ${left === 1 ? "is" : "are"} ${left} left.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You solved ${score} out of ${total} puppet stories correctly.`;
}
