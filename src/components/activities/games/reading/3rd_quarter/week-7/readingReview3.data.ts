// Pictures, sounds and task wording shared by Reading Review and Reading Final Exam for Q3; each game keeps its own look and cheers.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Each taught consonant's sound spelled for the speech voice, so it says the sound and not the letter name; tune by ear if one sounds off.
export const SOUNDS: Record<string, string> = {
  q: "kwuh",
  r: "rrr",
  s: "sss",
  t: "tuh",
  v: "vvv",
  w: "wuh",
  y: "yuh",
  z: "zzz",
};

// Keyed by the seeder's picture ids; first and last letters are read off the id itself. Emoji stand in until the picture art is added.
export const PICTURES: Record<string, { name: string; emoji: string }> = {
  queen: { name: "Queen", emoji: "👸" },
  tent: { name: "Tent", emoji: "⛺" },
  watch: { name: "Watch", emoji: "⌚" },
  yarn: { name: "Yarn", emoji: "🧶" },
  zebra: { name: "Zebra", emoji: "🦓" },
  box: { name: "Box", emoji: "📦" },
  fox: { name: "Fox", emoji: "🦊" },
  cat: { name: "Cat", emoji: "🐱" },
  hat: { name: "Hat", emoji: "👒" },
  bat: { name: "Bat", emoji: "🦇" },
  bag: { name: "Bag", emoji: "👜" },
  map: { name: "Map", emoji: "🗺️" },
  cap: { name: "Cap", emoji: "🧢" },
  van: { name: "Van", emoji: "🚐" },
  fan: { name: "Fan", emoji: "🪭" },
  hen: { name: "Hen", emoji: "🐔" },
  pen: { name: "Pen", emoji: "🖊️" },
  ten: { name: "Ten", emoji: "🔟" },
  net: { name: "Net", emoji: "🥅" },
  bed: { name: "Bed", emoji: "🛏️" },
  web: { name: "Web", emoji: "🕸️" },
  leg: { name: "Leg", emoji: "🦵" },
  pig: { name: "Pig", emoji: "🐷" },
  pin: { name: "Pin", emoji: "📌" },
  bin: { name: "Bin", emoji: "🗑️" },
  six: { name: "Six", emoji: "6️⃣" },
  lip: { name: "Lip", emoji: "👄" },
};

export type TaskType = "first" | "last" | "hear" | "missing" | "word";

export const TASK_TYPES: TaskType[] = ["first", "last", "hear", "missing", "word"];

export interface Task {
  type: TaskType;
  /** A picture id, or a letter for "hear". */
  target: string;
  /** Which letter of the word is hidden, for "missing" only. */
  blank: number;
}

/** What the instruction pill shows; the screen never prints a word that is only meant to be heard. */
export function questionText({ type }: Task): string {
  switch (type) {
    case "first":
      return "Which letter does it begin with?";
    case "last":
      return "Which letter does it end with?";
    case "hear":
      return "Which letter makes the sound you hear?";
    case "missing":
      return "Which letter is missing?";
    case "word":
      return "Read the word, then tap its picture!";
  }
}

// Capital letters make the speech voice say letter names, so a lone "t" is never read as a word.
export function questionSpeech({ type, target }: Task): string {
  switch (type) {
    case "first":
      return `${PICTURES[target].name}. Which letter does ${PICTURES[target].name.toLowerCase()} begin with?`;
    case "last":
      return `${PICTURES[target].name}. Which letter does ${PICTURES[target].name.toLowerCase()} end with?`;
    case "hear":
      return `Listen. ${SOUNDS[target]}... ${SOUNDS[target]}. Which letter makes this sound?`;
    case "missing":
      return `${PICTURES[target].name}. Which letter is missing from the word ${PICTURES[target].name.toLowerCase()}?`;
    case "word":
      // The word itself is not spoken before the tap, since reading it is the skill being checked.
      return "Read the word. Which picture matches it?";
  }
}

/** The why-line said after the answer, right or revealed. */
export function answerLine({ type, target }: Task, answer: string): string {
  const letter = answer.toUpperCase();
  switch (type) {
    case "first":
      return `${PICTURES[target].name} begins with ${letter}.`;
    case "last":
      return `${PICTURES[target].name} ends with ${letter}.`;
    case "hear":
      return `${letter} says ${SOUNDS[answer]}.`;
    case "missing":
      return `${letter} completes the word ${PICTURES[target].name.toLowerCase()}.`;
    case "word":
      return `The word is ${PICTURES[target].name.toLowerCase()}.`;
  }
}

export const REVEAL_TEXT = "This is the correct answer!";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}
