// Pictures and spoken lines for Consonant Sound Review 1; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// The consonants taught from Bb to Nn; every train car carries one of these.
export const LETTERS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N"];

// Which picture a round asks about comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; letter: string }> = {
  ball: { name: "Ball", emoji: "⚽", letter: "B" },
  cat: { name: "Cat", emoji: "🐱", letter: "C" },
  dog: { name: "Dog", emoji: "🐶", letter: "D" },
  fish: { name: "Fish", emoji: "🐟", letter: "F" },
  goat: { name: "Goat", emoji: "🐐", letter: "G" },
  hat: { name: "Hat", emoji: "🎩", letter: "H" },
  key: { name: "Key", emoji: "🔑", letter: "K" },
  lemon: { name: "Lemon", emoji: "🍋", letter: "L" },
  moon: { name: "Moon", emoji: "🌙", letter: "M" },
  nose: { name: "Nose", emoji: "👃", letter: "N" },
};

export const INSTRUCTION = "Listen, then tap the letter it begins with!";

export function promptSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${name}. Which letter does ${name.toLowerCase()} begin with?`;
}

const CHEERS = ["All aboard! You got it!", "Yes! Great listening!", "That's right!", "Choo choo! Super!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const { name, letter } = WORDS[word];
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${letter}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const { name, letter } = WORDS[word];
  return `${REVEAL_TEXT} ${name} begins with ${letter}.`;
}

export const DONE = "Choo choo! You matched every sound to its letter!";

export const DONE_MISSED = "Good work! Keep listening for the first sound of each word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} pictures.`;
}
