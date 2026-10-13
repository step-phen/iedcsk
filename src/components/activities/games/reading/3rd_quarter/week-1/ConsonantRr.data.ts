// Pictures and spoken lines for Consonant Rr; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Rr", name: "R" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isR: boolean }> = {
  rabbit: { name: "Rabbit", emoji: "🐰", isR: true },
  rainbow: { name: "Rainbow", emoji: "🌈", isR: true },
  ring: { name: "Ring", emoji: "💍", isR: true },
  robot: { name: "Robot", emoji: "🤖", isR: true },
  rose: { name: "Rose", emoji: "🌹", isR: true },
  sun: { name: "Sun", emoji: "☀️", isR: false },
  fish: { name: "Fish", emoji: "🐟", isR: false },
  cat: { name: "Cat", emoji: "🐱", isR: false },
  hat: { name: "Hat", emoji: "🎩", isR: false },
  ball: { name: "Ball", emoji: "⚽", isR: false },
  dog: { name: "Dog", emoji: "🐶", isR: false },
  pig: { name: "Pig", emoji: "🐷", isR: false },
};

export const INSTRUCTION = "Tap the cloud that begins with R!";

export const LISTEN = "Pitter-patter! Listen to the clouds.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Right on!", "Yes! Great listening!", "That's right!", "Really good!", "Wonderful!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "The rain made a rainbow! You found every R picture!";

export const DONE_MISSED = "Good work! Keep listening for the R sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} R pictures.`;
}
