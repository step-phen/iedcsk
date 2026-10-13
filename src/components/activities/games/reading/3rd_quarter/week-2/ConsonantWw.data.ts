// Pictures and spoken lines for Consonant Ww; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Ww", name: "W" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isW: boolean }> = {
  watch: { name: "Watch", emoji: "⌚", isW: true },
  whale: { name: "Whale", emoji: "🐋", isW: true },
  watermelon: { name: "Watermelon", emoji: "🍉", isW: true },
  window: { name: "Window", emoji: "🪟", isW: true },
  worm: { name: "Worm", emoji: "🪱", isW: true },
  sun: { name: "Sun", emoji: "☀️", isW: false },
  dog: { name: "Dog", emoji: "🐶", isW: false },
  moon: { name: "Moon", emoji: "🌙", isW: false },
  hat: { name: "Hat", emoji: "🎩", isW: false },
  pig: { name: "Pig", emoji: "🐷", isW: false },
  ball: { name: "Ball", emoji: "⚽", isW: false },
  cake: { name: "Cake", emoji: "🎂", isW: false },
};

export const INSTRUCTION = "Tap the well that begins with W!";

export const LISTEN = "Up comes the bucket! Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Wow!", "Yes! Great listening!", "That's right!", "Way to go!", "Wonderful!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "All your wishes came true! You found every W picture!";

export const DONE_MISSED = "Good work! Keep listening for the W sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} W pictures.`;
}
