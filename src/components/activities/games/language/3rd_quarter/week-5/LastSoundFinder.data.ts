// Word pictures, last sounds and spoken lines for Last Sound Finder (Kite Day); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which words a round uses comes from activity_questions; `last` is how the speech voice says the word's final sound.
export const WORDS: Record<string, { name: string; emoji: string; last: string }> = {
  ball: { name: "ball", emoji: "⚽", last: "lll" },
  bed: { name: "bed", emoji: "🛏️", last: "duh" },
  book: { name: "book", emoji: "📕", last: "kuh" },
  bus: { name: "bus", emoji: "🚌", last: "sss" },
  cat: { name: "cat", emoji: "🐱", last: "tuh" },
  cup: { name: "cup", emoji: "☕", last: "puh" },
  dog: { name: "dog", emoji: "🐶", last: "guh" },
  hat: { name: "hat", emoji: "🎩", last: "tuh" },
  house: { name: "house", emoji: "🏠", last: "sss" },
  map: { name: "map", emoji: "🗺️", last: "puh" },
  moon: { name: "moon", emoji: "🌙", last: "nnn" },
  pig: { name: "pig", emoji: "🐷", last: "guh" },
  sun: { name: "sun", emoji: "☀️", last: "nnn" },
};

// Kite colors per bow on the tail line, so the three bows never look alike.
export const BOW_COLORS = ["#f03e3e", "#7950f2", "#12b886"];

export const INSTRUCTION = "Listen to the word, then tap the bow that ends the same way!";

export const LOADING = "The kites are taking off…";

const listNames = (keys: string[]) => {
  const names = keys.map((k) => WORDS[k].name);
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1)}`;
};

export function promptSpeech(word: string, choices: string[]): string {
  const name = WORDS[word].name;
  return `Listen... ${name}... ${name}. Which picture ends with the same sound as ${name}? ${listNames(choices)}?`;
}

const sameEnd = (word: string, answer: string) => `${WORDS[word].name} and ${WORDS[answer].name} both end with ${WORDS[word].last}`;

export function correctSpeech(word: string, answer: string): string {
  return `Whoosh! ${sameEnd(word, answer)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(word: string, answer: string): string {
  return `${REVEAL} ${sameEnd(word, answer)}.`;
}

export const DONE = "Your kite is flying high! You found every last sound!";

export const DONE_MISSED = "Good try! Keep listening for the sound at the end of each word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You tied ${score} out of ${total} bows to the kite.`;
}
