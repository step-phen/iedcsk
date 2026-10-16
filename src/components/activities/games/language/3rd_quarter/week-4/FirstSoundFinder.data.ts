// Word pictures, first sounds and spoken lines for First Sound Finder (Sound Factory); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which words a round uses comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  ball: { name: "ball", emoji: "⚽" },
  banana: { name: "banana", emoji: "🍌" },
  bus: { name: "bus", emoji: "🚌" },
  cat: { name: "cat", emoji: "🐱" },
  dog: { name: "dog", emoji: "🐶" },
  fish: { name: "fish", emoji: "🐟" },
  leaf: { name: "leaf", emoji: "🍃" },
  lion: { name: "lion", emoji: "🦁" },
  mango: { name: "mango", emoji: "🥭" },
  moon: { name: "moon", emoji: "🌙" },
  pig: { name: "pig", emoji: "🐷" },
  sock: { name: "sock", emoji: "🧦" },
  sun: { name: "sun", emoji: "☀️" },
  tiger: { name: "tiger", emoji: "🐯" },
  tree: { name: "tree", emoji: "🌳" },
};

// How the speech voice says each first sound, so it says the sound and not the letter name.
const FIRST_SOUNDS: Record<string, string> = {
  b: "buh",
  c: "kuh",
  d: "duh",
  f: "fff",
  l: "lll",
  m: "mmm",
  p: "puh",
  s: "sss",
  t: "tuh",
};

// How many copies of the choices ride the belt, so it always looks full while it loops.
export const BELT_COPIES = 4;

export const INSTRUCTION = "Listen to the word, then tap the picture that starts the same way!";

export const LOADING = "Starting the sound machine…";

const listNames = (keys: string[]) => {
  const names = keys.map((k) => WORDS[k].name);
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1)}`;
};

export function promptSpeech(word: string, choices: string[]): string {
  const name = WORDS[word].name;
  return `Listen... ${name}... ${name}. Which picture starts with the same sound as ${name}? ${listNames(choices)}?`;
}

const sameStart = (word: string, answer: string) =>
  `${WORDS[word].name} and ${WORDS[answer].name} both start with ${FIRST_SOUNDS[word[0]] ?? word[0]}`;

export function correctSpeech(word: string, answer: string): string {
  return `Ding ding! ${sameStart(word, answer)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(word: string, answer: string): string {
  return `${REVEAL} ${sameStart(word, answer)}.`;
}

export const DONE = "The sound machine is all done! You found every first sound!";

export const DONE_MISSED = "Good try! Keep listening for the first sound in each word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} first sounds.`;
}
