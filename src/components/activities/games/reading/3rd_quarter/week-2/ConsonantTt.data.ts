// Pictures and spoken lines for Consonant Tt; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Tt", name: "T" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isT: boolean }> = {
  tiger: { name: "Tiger", emoji: "🐯", isT: true },
  tomato: { name: "Tomato", emoji: "🍅", isT: true },
  turtle: { name: "Turtle", emoji: "🐢", isT: true },
  toothbrush: { name: "Toothbrush", emoji: "🪥", isT: true },
  teddy: { name: "Teddy bear", emoji: "🧸", isT: true },
  sun: { name: "Sun", emoji: "☀️", isT: false },
  fish: { name: "Fish", emoji: "🐟", isT: false },
  moon: { name: "Moon", emoji: "🌙", isT: false },
  ball: { name: "Ball", emoji: "⚽", isT: false },
  pig: { name: "Pig", emoji: "🐷", isT: false },
  leaf: { name: "Leaf", emoji: "🍃", isT: false },
  cake: { name: "Cake", emoji: "🎂", isT: false },
};

export const INSTRUCTION = "Tap the tent that begins with T!";

export const LISTEN = "Zip! Listen to the tents.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Terrific!", "Yes! Great listening!", "That's right!", "Top job!", "Wonderful!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Time for s'mores! You found every T picture!";

export const DONE_MISSED = "Good work! Keep listening for the T sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} T pictures.`;
}
