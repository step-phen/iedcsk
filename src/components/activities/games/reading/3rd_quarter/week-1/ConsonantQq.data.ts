// Pictures and spoken lines for Consonant Qq; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Qq", name: "Q" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isQ: boolean }> = {
  queen: { name: "Queen", emoji: "👸", isQ: true },
  question: { name: "Question mark", emoji: "❓", isQ: true },
  quarter: { name: "Quarter", emoji: "🪙", isQ: true },
  quiet: { name: "Quiet", emoji: "🤫", isQ: true },
  quiz: { name: "Quiz", emoji: "📝", isQ: true },
  sun: { name: "Sun", emoji: "☀️", isQ: false },
  fish: { name: "Fish", emoji: "🐟", isQ: false },
  dog: { name: "Dog", emoji: "🐶", isQ: false },
  moon: { name: "Moon", emoji: "🌙", isQ: false },
  hat: { name: "Hat", emoji: "🎩", isQ: false },
  ball: { name: "Ball", emoji: "⚽", isQ: false },
  pig: { name: "Pig", emoji: "🐷", isQ: false },
};

export const INSTRUCTION = "Tap the quilt patch that begins with Q!";

export const LISTEN = "Stitch, stitch! Listen to the quilt.";

export const QUESTION = `Which picture begins with ${LETTER.name}, like queen?`;

const CHEERS = ["Quite right!", "Yes! Great listening!", "That's right!", "Super quick!", "Wonderful!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "The quilt is finished! You found every Q picture!";

export const DONE_MISSED = "Good work! Keep listening for the kw sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} Q pictures.`;
}
