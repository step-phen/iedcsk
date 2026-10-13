// Pictures and spoken lines for Consonant Nn; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Nn", name: "N" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isN: boolean }> = {
  nose: { name: "Nose", emoji: "👃", isN: true },
  nut: { name: "Nut", emoji: "🥜", isN: true },
  net: { name: "Net", emoji: "🥅", isN: true },
  noodles: { name: "Noodles", emoji: "🍜", isN: true },
  nine: { name: "Nine", emoji: "9️⃣", isN: true },
  sun: { name: "Sun", emoji: "☀️", isN: false },
  fish: { name: "Fish", emoji: "🐟", isN: false },
  dog: { name: "Dog", emoji: "🐶", isN: false },
  hat: { name: "Hat", emoji: "🎩", isN: false },
  egg: { name: "Egg", emoji: "🥚", isN: false },
};

export const INSTRUCTION = "Tap the nest that begins with N!";

export const LISTEN = "Crack, crack! Listen to the nests.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Tweet tweet! You got it!", "Yes! Great listening!", "That's right!", "Nice one!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Tweet tweet! You found every N picture!";

export const DONE_MISSED = "Good work! Keep listening for the N sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} N pictures.`;
}
