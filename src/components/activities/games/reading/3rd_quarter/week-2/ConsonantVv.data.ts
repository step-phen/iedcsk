// Pictures and spoken lines for Consonant Vv; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Vv", name: "V" };

// Which pictures a round shows and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; isV: boolean }> = {
  violin: { name: "Violin", emoji: "🎻", isV: true },
  vase: { name: "Vase", emoji: "🏺", isV: true },
  volcano: { name: "Volcano", emoji: "🌋", isV: true },
  vest: { name: "Vest", emoji: "🦺", isV: true },
  vegetables: { name: "Vegetables", emoji: "🥦", isV: true },
  sun: { name: "Sun", emoji: "☀️", isV: false },
  dog: { name: "Dog", emoji: "🐶", isV: false },
  moon: { name: "Moon", emoji: "🌙", isV: false },
  hat: { name: "Hat", emoji: "🎩", isV: false },
  pig: { name: "Pig", emoji: "🐷", isV: false },
  cake: { name: "Cake", emoji: "🎂", isV: false },
};

export const INSTRUCTION = "Tap the van that begins with V!";

export const LISTEN = "Vroom, vroom! Here come the vans. Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Very good!", "Yes! Great listening!", "That's right!", "Victory!", "Wonderful!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "The parade is done! You found every V picture!";

export const DONE_MISSED = "Good work! Keep listening for the V sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} V pictures.`;
}
