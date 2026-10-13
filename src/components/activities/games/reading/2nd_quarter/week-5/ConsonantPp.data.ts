// Pictures and spoken lines for Consonant Pp; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Pp", name: "P" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isP: boolean }> = {
  pig: { name: "Pig", emoji: "🐷", isP: true },
  pizza: { name: "Pizza", emoji: "🍕", isP: true },
  pear: { name: "Pear", emoji: "🍐", isP: true },
  pencil: { name: "Pencil", emoji: "✏️", isP: true },
  panda: { name: "Panda", emoji: "🐼", isP: true },
  sun: { name: "Sun", emoji: "☀️", isP: false },
  hat: { name: "Hat", emoji: "🎩", isP: false },
  fish: { name: "Fish", emoji: "🐟", isP: false },
  egg: { name: "Egg", emoji: "🥚", isP: false },
  dog: { name: "Dog", emoji: "🐶", isP: false },
};

// One canopy colour per drop zone, left to right.
export const CANOPIES = [
  { main: "#ff7b6b", stripe: "#ffd4cc" },
  { main: "#7b6bff", stripe: "#d9d4ff" },
  { main: "#2fb8a0", stripe: "#c6efe7" },
];

export const INSTRUCTION = "Tap the parachute that begins with P!";

export const LISTEN = "Look up! Here come the parachutes. Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Perfect landing!", "Yes! Great listening!", "That's right!", "Pop! You got it!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${WORDS[word].name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} ${WORDS[word].name} begins with ${LETTER.name}.`;
}

export const DONE = "Perfect landings! You found every P picture!";

export const DONE_MISSED = "Good work! Keep listening for the P sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} P pictures.`;
}
