// Pictures, sounds and task wording shared by Reading Review and Reading Final Exam for Q2; each game keeps its own look and cheers.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Each taught consonant's sound spelled for the speech voice, so it says the sound and not the letter name; tune by ear if one sounds off.
export const SOUNDS: Record<string, string> = {
  B: "buh",
  C: "kuh",
  D: "duh",
  F: "fff",
  G: "guh",
  H: "huh",
  J: "juh",
  K: "kuh",
  L: "lll",
  M: "mmm",
  N: "nnn",
  P: "puh",
};

// Keyed by the seeder's picture ids; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; letter: string }> = {
  bee: { name: "Bee", emoji: "🐝", letter: "B" },
  cat: { name: "Cat", emoji: "🐱", letter: "C" },
  dog: { name: "Dog", emoji: "🐶", letter: "D" },
  fish: { name: "Fish", emoji: "🐟", letter: "F" },
  goat: { name: "Goat", emoji: "🐐", letter: "G" },
  hat: { name: "Hat", emoji: "🎩", letter: "H" },
  juice: { name: "Juice", emoji: "🧃", letter: "J" },
  kite: { name: "Kite", emoji: "🪁", letter: "K" },
  lemon: { name: "Lemon", emoji: "🍋", letter: "L" },
  moon: { name: "Moon", emoji: "🌙", letter: "M" },
  nose: { name: "Nose", emoji: "👃", letter: "N" },
  pig: { name: "Pig", emoji: "🐷", letter: "P" },
};

export type TaskType = "partner" | "sound" | "picture" | "sort" | "letter";

export const TASK_TYPES: TaskType[] = ["partner", "sound", "picture", "sort", "letter"];

export interface Task {
  type: TaskType;
  target: string;
}

/** What the instruction pill shows; letter and sound tasks are only heard, so the screen never gives the answer away. */
export function questionText({ type }: Task): string {
  switch (type) {
    case "partner":
      return "Find the small letter partner!";
    case "sound":
      return "Which letter makes the sound you hear?";
    case "picture":
      return "Which picture begins with the sound you hear?";
    case "sort":
      return "Which letter does this picture begin with?";
    case "letter":
      return "Find the letter you hear!";
  }
}

// Capital letters make the speech voice say letter names, so a lone "b" is never read as a word.
export function questionSpeech({ type, target }: Task, choices: string[]): string {
  switch (type) {
    case "partner":
      return `Here is big ${target}. Find its small letter partner.`;
    case "sound":
      return `Listen. ${SOUNDS[target]}... ${SOUNDS[target]}. Which letter makes this sound?`;
    case "picture":
      return `${choices.map((w) => WORDS[w].name).join(", ")}. Which picture begins with ${SOUNDS[target]}?`;
    case "sort":
      return `${WORDS[target].name}. Which letter does ${WORDS[target].name.toLowerCase()} begin with?`;
    case "letter":
      return `Find the letter ${target}.`;
  }
}

/** The why-line said after the answer, right or revealed. */
export function answerLine({ type, target }: Task, answer: string): string {
  switch (type) {
    case "partner":
      return `Big ${target} and small ${target} are partners.`;
    case "sound":
      return `${answer} says ${SOUNDS[answer]}.`;
    case "picture":
      return `${WORDS[answer].name} begins with ${target}.`;
    case "sort":
      return `${WORDS[target].name} begins with ${answer}.`;
    case "letter":
      return `This is the letter ${answer}.`;
  }
}

export const REVEAL_TEXT = "This is the correct answer!";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}
