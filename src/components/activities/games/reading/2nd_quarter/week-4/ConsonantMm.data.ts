// Pictures and spoken lines for Consonant Mm; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Mm", name: "M" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isM: boolean }> = {
  moon: { name: "Moon", emoji: "🌙", isM: true },
  monkey: { name: "Monkey", emoji: "🐒", isM: true },
  mango: { name: "Mango", emoji: "🥭", isM: true },
  mouse: { name: "Mouse", emoji: "🐭", isM: true },
  milk: { name: "Milk", emoji: "🥛", isM: true },
  sun: { name: "Sun", emoji: "☀️", isM: false },
  fish: { name: "Fish", emoji: "🐟", isM: false },
  dog: { name: "Dog", emoji: "🐶", isM: false },
  cat: { name: "Cat", emoji: "🐱", isM: false },
  hat: { name: "Hat", emoji: "🎩", isM: false },
};

export const INSTRUCTION = "Tap the mailbox that begins with M!";

export const LISTEN = "You've got mail! Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Special delivery! You got it!", "Yes! Great listening!", "That's right!", "Marvelous!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "All delivered! You found every M picture!";

export const DONE_MISSED = "Good work! Keep listening for the M sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} M pictures.`;
}
