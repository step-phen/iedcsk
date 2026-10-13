// Pictures and spoken lines for Consonant Ss; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Ss", name: "S" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isS: boolean }> = {
  sun: { name: "Sun", emoji: "☀️", isS: true },
  sock: { name: "Sock", emoji: "🧦", isS: true },
  snake: { name: "Snake", emoji: "🐍", isS: true },
  star: { name: "Star", emoji: "⭐", isS: true },
  seal: { name: "Seal", emoji: "🦭", isS: true },
  dog: { name: "Dog", emoji: "🐶", isS: false },
  moon: { name: "Moon", emoji: "🌙", isS: false },
  hat: { name: "Hat", emoji: "🎩", isS: false },
  ball: { name: "Ball", emoji: "⚽", isS: false },
  pig: { name: "Pig", emoji: "🐷", isS: false },
  kite: { name: "Kite", emoji: "🪁", isS: false },
  cake: { name: "Cake", emoji: "🎂", isS: false },
};

export const INSTRUCTION = "Tap the seashell that begins with S!";

export const LISTEN = "Splash! Listen to the seashells.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Super!", "Yes! Great listening!", "That's right!", "So smart!", "Sensational!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "What a shiny shore! You found every S picture!";

export const DONE_MISSED = "Good work! Keep listening for the S sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} S pictures.`;
}
