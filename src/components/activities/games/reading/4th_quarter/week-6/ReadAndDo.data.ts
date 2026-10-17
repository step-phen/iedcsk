// Things, actions and spoken lines for Read and Do; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// "small" things are drawn smaller so "big" in a spell has something to tell apart; emoji stand in until drawn art is added.
export const THINGS: Record<string, { name: string; emoji: string; small?: boolean }> = {
  cat: { name: "cat", emoji: "🐱" },
  hat: { name: "hat", emoji: "🎩" },
  bat: { name: "bat", emoji: "🦇" },
  "big-pig": { name: "big pig", emoji: "🐷" },
  "small-pig": { name: "small pig", emoji: "🐷", small: true },
  "big-dog": { name: "big dog", emoji: "🐶" },
  cup: { name: "cup", emoji: "☕" },
  pup: { name: "pup", emoji: "🐶" },
  pig: { name: "pig", emoji: "🐷" },
  bug: { name: "bug", emoji: "🐛" },
  bed: { name: "bed", emoji: "🛏️" },
  bag: { name: "bag", emoji: "👜" },
  hen: { name: "hen", emoji: "🐔" },
  bus: { name: "bus", emoji: "🚌" },
  star: { name: "star", emoji: "⭐" },
  moon: { name: "moon", emoji: "🌙" },
  sun: { name: "sun", emoji: "☀️" },
};

// The little picture that pops over the thing when the learner does the spell's action.
export const ACTIONS: Record<string, string> = {
  pat: "✋",
  tap: "👆",
  hug: "❤️",
  zip: "✨",
  hop: "🪵",
};

// The wizard models one spell before the learner reads any.
export const DEMO = { text: "Tap the star.", action: "tap", target: "star", things: ["moon", "star", "sun"] };

export const DEMO_START = "Watch me! I read the spell, then I do it.";

export const DEMO_END = "I tapped the star! Now you try.";

export const INSTRUCTION = "Read the spell, then do it!";

export const QUESTION = "Read the spell. Then do what it says!";

const CHEERS = ["Abracadabra! You did it!", "Magic reading!", "That's right!", "Super spell reader!", "Well done!"];

export function correctSpeech(text: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${text}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(text: string): string {
  return `${REVEAL_TEXT} ${text}`;
}

export const DONE = "Amazing! You read every spell and made the magic happen!";

export const DONE_MISSED = "Good work! Read every word in the spell.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You did ${score} out of ${total} spells.`;
}
