// Pictures and spoken lines for Consonant Zz; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Zz", name: "Z" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isZ: boolean }> = {
  zebra: { name: "Zebra", emoji: "🦓", isZ: true },
  zero: { name: "Zero", emoji: "0️⃣", isZ: true },
  zipper: { name: "Zipper", emoji: "🤐", isZ: true },
  zucchini: { name: "Zucchini", emoji: "🥒", isZ: true },
  zigzag: { name: "Zigzag", emoji: "〽️", isZ: true },
  dog: { name: "Dog", emoji: "🐶", isZ: false },
  moon: { name: "Moon", emoji: "🌙", isZ: false },
  cat: { name: "Cat", emoji: "🐱", isZ: false },
  hat: { name: "Hat", emoji: "🎩", isZ: false },
  ball: { name: "Ball", emoji: "⚽", isZ: false },
  pig: { name: "Pig", emoji: "🐷", isZ: false },
  fish: { name: "Fish", emoji: "🐟", isZ: false },
  cake: { name: "Cake", emoji: "🎂", isZ: false },
  hen: { name: "Hen", emoji: "🐔", isZ: false },
};

export const INSTRUCTION = "Tap the bag that begins with Z!";

export const LISTEN = "Zip, zip, open the bags! Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Zoom, zoom! Yes!", "Yes! Great listening!", "That's right!", "Super job!", "You got it!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Zippity-zoo! You found every Z picture!";

export const DONE_MISSED = "Good work! Keep listening for the Z sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} Z pictures.`;
}
