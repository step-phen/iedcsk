// Pictures, puzzle colours and spoken lines for First Letter Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// The consonants taught this quarter; every letter piece carries one of these.
export const LETTERS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P"];

// Which picture a round shows comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; letter: string }> = {
  kite: { name: "Kite", emoji: "🪁", letter: "K" },
  lemon: { name: "Lemon", emoji: "🍋", letter: "L" },
  juice: { name: "Juice", emoji: "🧃", letter: "J" },
  fork: { name: "Fork", emoji: "🍴", letter: "F" },
  hat: { name: "Hat", emoji: "🎩", letter: "H" },
};

// One colour per letter piece, left to right.
export const PIECES = ["#7ed6a5", "#ffb4a2", "#a0c4ff"];

export const INSTRUCTION = "Drag the picture to its first letter!";

export const NEXT = "Here is the next puzzle piece!";

export function promptSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${name}. Which letter does ${name.toLowerCase()} begin with?`;
}

const CHEERS = ["Click! It fits!", "Yes! Great matching!", "That's right!", "Puzzle pro!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const { name, letter } = WORDS[word];
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${letter}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const { name, letter } = WORDS[word];
  return `${REVEAL_TEXT} ${name} begins with ${letter}.`;
}

export const DONE = "All the pieces fit! You matched every picture!";

export const DONE_MISSED = "Good work! Keep listening for the first sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} pictures.`;
}
