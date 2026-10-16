// Word pictures, last sounds and spoken lines for Ending Sound Partners (Puzzle Table); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which words a round uses comes from activity_questions; `last` is how the speech voice says the word's final sound.
export const WORDS: Record<string, { name: string; emoji: string; last: string }> = {
  bed: { name: "bed", emoji: "🛏️", last: "duh" },
  bird: { name: "bird", emoji: "🐦", last: "duh" },
  book: { name: "book", emoji: "📕", last: "kuh" },
  bus: { name: "bus", emoji: "🚌", last: "sss" },
  cat: { name: "cat", emoji: "🐱", last: "tuh" },
  cup: { name: "cup", emoji: "☕", last: "puh" },
  dog: { name: "dog", emoji: "🐶", last: "guh" },
  dress: { name: "dress", emoji: "👗", last: "sss" },
  fish: { name: "fish", emoji: "🐟", last: "shh" },
  goat: { name: "goat", emoji: "🐐", last: "tuh" },
  hat: { name: "hat", emoji: "🎩", last: "tuh" },
  leaf: { name: "leaf", emoji: "🍃", last: "fff" },
  moon: { name: "moon", emoji: "🌙", last: "nnn" },
  pen: { name: "pen", emoji: "🖊️", last: "nnn" },
  pig: { name: "pig", emoji: "🐷", last: "guh" },
  sun: { name: "sun", emoji: "☀️", last: "nnn" },
};

// Paper colors per loose piece, so the three pieces never look alike.
export const PIECE_COLORS = ["#ffa94d", "#69db7c", "#da77f2"];

export const INSTRUCTION = "Listen, then drag the piece that ends the same way!";

export const LOADING = "Spreading out the puzzle…";

const listNames = (keys: string[]) => {
  const names = keys.map((k) => WORDS[k].name);
  return `${names.slice(0, -1).join(", ")}, or ${names.at(-1)}`;
};

export function promptSpeech(word: string, choices: string[]): string {
  const name = WORDS[word].name;
  return `Listen... ${name}... ${name}. Which piece ends with the same sound as ${name}? ${listNames(choices)}?`;
}

const sameEnd = (word: string, answer: string) => `${WORDS[word].name} and ${WORDS[answer].name} both end with ${WORDS[word].last}`;

export function correctSpeech(word: string, answer: string): string {
  return `Click! A perfect fit! ${sameEnd(word, answer)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(word: string, answer: string): string {
  return `${REVEAL} ${sameEnd(word, answer)}.`;
}

export const DONE = "Every puzzle is finished! You matched all the ending sounds!";

export const DONE_MISSED = "Good try! Keep listening for the sound at the end of each word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} puzzle partners.`;
}
