// Pictures and spoken lines for Consonant Xx; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Xx", name: "X" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; endsX: boolean }> = {
  box: { name: "Box", emoji: "📦", endsX: true },
  fox: { name: "Fox", emoji: "🦊", endsX: true },
  six: { name: "Six", emoji: "6️⃣", endsX: true },
  ox: { name: "Ox", emoji: "🐂", endsX: true },
  ax: { name: "Ax", emoji: "🪓", endsX: true },
  dog: { name: "Dog", emoji: "🐶", endsX: false },
  hat: { name: "Hat", emoji: "🎩", endsX: false },
  cat: { name: "Cat", emoji: "🐱", endsX: false },
  sun: { name: "Sun", emoji: "☀️", endsX: false },
  pig: { name: "Pig", emoji: "🐷", endsX: false },
  bed: { name: "Bed", emoji: "🛏️", endsX: false },
  hen: { name: "Hen", emoji: "🐔", endsX: false },
  ball: { name: "Ball", emoji: "⚽", endsX: false },
  moon: { name: "Moon", emoji: "🌙", endsX: false },
};

export const INSTRUCTION = "Tap the toy whose name ends with x!";

export const LISTEN = "Pop goes the toy box! Listen.";

export const QUESTION = `Which picture ends with the ${LETTER.name} sound?`;

const CHEERS = ["Excellent!", "Yes! Great listening!", "That's right!", "Super job!", "You got it!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} ends with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} ends with ${LETTER.name}.`;
}

export const DONE = "Hooray! You found every toy that ends with X!";

export const DONE_MISSED = "Good work! Keep listening for the X sound at the end.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} X pictures.`;
}
