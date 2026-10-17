// Pictures and spoken lines for Story Order; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Event pictures; emoji stand in until drawn art is added.
export const EVENTS: Record<string, { name: string; emoji: string }> = {
  seed: { name: "planting a seed", emoji: "🌰" },
  sprout: { name: "a sprout", emoji: "🌱" },
  flower: { name: "a big flower", emoji: "🌻" },
  egg: { name: "an egg", emoji: "🥚" },
  cook: { name: "cooking the egg", emoji: "🍳" },
  eat: { name: "eating", emoji: "😋" },
  sunrise: { name: "the sun coming up", emoji: "🌅" },
  play: { name: "playing", emoji: "⚽" },
  moon: { name: "the moon", emoji: "🌙" },
  icecream: { name: "an ice cream", emoji: "🍦" },
  hot: { name: "the hot sun", emoji: "☀️" },
  melt: { name: "melted ice cream", emoji: "💧" },
  clouds: { name: "dark clouds", emoji: "☁️" },
  rain: { name: "rain", emoji: "🌧️" },
  puddle: { name: "a puddle splash", emoji: "💦" },
};

export const SQUARE_LABELS = ["Beginning", "Middle", "End"];

export const INSTRUCTION = "Read the story, then hop the pictures in order!";

export const QUESTION = "Read the story. Tap the pictures in order: beginning, middle, and end.";

function retell(sentences: string[]): string {
  return `First, ${sentences[0]} Next, ${sentences[1]} Last, ${sentences[2]}`;
}

const CHEERS = ["Hop, hop, hooray!", "Great order!", "That's right!", "Super story reader!", "You did it!"];

export function correctSpeech(sentences: string[], roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${retell(sentences)}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(sentences: string[]): string {
  return `${REVEAL_TEXT} ${retell(sentences)}`;
}

export const DONE = "Hooray! You put every story in order!";

export const DONE_MISSED = "Good job! Think about what happens first, next, and last.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You ordered ${score} out of ${total} stories.`;
}
