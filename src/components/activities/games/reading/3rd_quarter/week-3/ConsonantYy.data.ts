// Pictures and spoken lines for Consonant Yy; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Yy", name: "Y" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isY: boolean }> = {
  yarn: { name: "Yarn", emoji: "🧶", isY: true },
  yawn: { name: "Yawn", emoji: "🥱", isY: true },
  yolk: { name: "Yolk", emoji: "🍳", isY: true },
  yam: { name: "Yam", emoji: "🍠", isY: true },
  yacht: { name: "Yacht", emoji: "⛵", isY: true },
  dog: { name: "Dog", emoji: "🐶", isY: false },
  sun: { name: "Sun", emoji: "☀️", isY: false },
  cat: { name: "Cat", emoji: "🐱", isY: false },
  moon: { name: "Moon", emoji: "🌙", isY: false },
  hat: { name: "Hat", emoji: "🎩", isY: false },
  ball: { name: "Ball", emoji: "⚽", isY: false },
  pig: { name: "Pig", emoji: "🐷", isY: false },
  fish: { name: "Fish", emoji: "🐟", isY: false },
  cake: { name: "Cake", emoji: "🎂", isY: false },
};

export const INSTRUCTION = "Tap the yo-yo that begins with Y!";

export const LISTEN = "Down come the yo-yos! Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Yay!", "Yes! Great listening!", "That's right!", "Super job!", "You did it!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Take a bow! You found every Y picture!";

export const DONE_MISSED = "Good work! Keep listening for the Y sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} Y pictures.`;
}
