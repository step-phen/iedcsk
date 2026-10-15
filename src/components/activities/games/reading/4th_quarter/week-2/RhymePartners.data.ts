// Pictures and spoken lines for Rhyme Partners; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round starts from and which socks are in the basket come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  cat: { name: "cat", emoji: "🐱" },
  hat: { name: "hat", emoji: "🎩" },
  dog: { name: "dog", emoji: "🐶" },
  sun: { name: "sun", emoji: "☀️" },
  fox: { name: "fox", emoji: "🦊" },
  box: { name: "box", emoji: "📦" },
  cup: { name: "cup", emoji: "☕" },
  bed: { name: "bed", emoji: "🛏️" },
  goat: { name: "goat", emoji: "🐐" },
  boat: { name: "boat", emoji: "⛵" },
  car: { name: "car", emoji: "🚗" },
  fish: { name: "fish", emoji: "🐟" },
  moon: { name: "moon", emoji: "🌙" },
  spoon: { name: "spoon", emoji: "🥄" },
  hen: { name: "hen", emoji: "🐔" },
  bus: { name: "bus", emoji: "🚌" },
  bee: { name: "bee", emoji: "🐝" },
  tree: { name: "tree", emoji: "🌳" },
  cake: { name: "cake", emoji: "🎂" },
  pig: { name: "pig", emoji: "🐷" },
};

export const INSTRUCTION = "Find the sock that rhymes!";

export function listenLine(word: string): string {
  return `This sock is ${WORDS[word].name}. Listen to the socks in the basket.`;
}

export function questionLine(word: string): string {
  return `Which word rhymes with ${WORDS[word].name}?`;
}

const CHEERS = ["A perfect pair!", "Great listening!", "That's right!", "Rhyme time!", "Well done!"];

export function correctSpeech(word: string, partner: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${WORDS[word].name} and ${WORDS[partner].name} rhyme.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string, partner: string): string {
  return `${REVEAL_TEXT} ${WORDS[word].name} and ${WORDS[partner].name} rhyme.`;
}

export const DONE = "Hooray! You found every rhyme partner!";

export const DONE_MISSED = "Good listening! Keep listening for the same ending sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You paired ${score} out of ${total} socks.`;
}
