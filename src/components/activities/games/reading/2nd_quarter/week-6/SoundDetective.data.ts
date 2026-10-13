// Pictures and spoken lines for Sound Detective; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// The consonants taught this quarter; every clue card carries one of these.
export const LETTERS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P"];

// Which picture a round shows comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; letter: string }> = {
  pen: { name: "Pen", emoji: "🖊️", letter: "P" },
  ball: { name: "Ball", emoji: "🏀", letter: "B" },
  moon: { name: "Moon", emoji: "🌙", letter: "M" },
  nose: { name: "Nose", emoji: "👃", letter: "N" },
  goat: { name: "Goat", emoji: "🐐", letter: "G" },
};

// One paper colour and tilt per clue card, left to right.
export const CARDS = [
  { paper: "#fff7c2", tilt: -4 },
  { paper: "#d6f0ff", tilt: 3 },
  { paper: "#ffe0e6", tilt: -2 },
];

export const INSTRUCTION = "Listen closely, then tap the first letter!";

export const NEXT = "A new clue! Look in the magnifying glass.";

export function promptSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${name}... ${name.toLowerCase()}. What letter does ${name.toLowerCase()} begin with?`;
}

const CHEERS = ["Case closed!", "Yes! Sharp ears!", "That's right!", "Great detective work!", "You cracked it!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const { name, letter } = WORDS[word];
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${letter}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const { name, letter } = WORDS[word];
  return `${REVEAL_TEXT} ${name} begins with ${letter}.`;
}

export const DONE = "Case closed! You solved every sound clue!";

export const DONE_MISSED = "Good work, detective! Keep listening closely to the first sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You solved ${score} out of ${total} clues.`;
}
