// Pictures, task labels and spoken lines for Language Final Assessment (Q4); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type Kind = "sound" | "picture" | "story" | "direction";

export const KINDS: Kind[] = ["sound", "picture", "story", "direction"];

export const TASK_LABEL: Record<Kind, { icon: string; text: string }> = {
  sound: { icon: "👂", text: "Sound" },
  picture: { icon: "🖼️", text: "Picture" },
  story: { icon: "📖", text: "Story" },
  direction: { icon: "👉", text: "Direction" },
};

// Emoji stand in until drawn art is added; "count" repeats the emoji and "small" shrinks it for direction tasks.
export const PICS: Record<string, { said: string; emoji: string; count?: number; small?: boolean }> = {
  snake: { said: "snake", emoji: "🐍" },
  fish: { said: "fish", emoji: "🐟" },
  cup: { said: "cup", emoji: "🥤" },
  dog: { said: "dog", emoji: "🐶" },
  tree: { said: "tree", emoji: "🌳" },
  hat: { said: "hat", emoji: "🎩" },
  cat: { said: "cat", emoji: "🐱" },
  sun: { said: "sun", emoji: "☀️" },
  bear: { said: "bear", emoji: "🐻" },
  monkey: { said: "monkey", emoji: "🐒" },
  pig: { said: "pig", emoji: "🐷" },
  grandpa: { said: "grandpa", emoji: "👴" },
  baby: { said: "baby", emoji: "👶" },
  dad: { said: "Dad", emoji: "👨" },
  grandma: { said: "grandma", emoji: "👵" },
  rock: { said: "rock", emoji: "🪨" },
  teddy: { said: "teddy bear", emoji: "🧸" },
  happy: { said: "happy face", emoji: "😄" },
  sad: { said: "sad face", emoji: "😢" },
  angry: { said: "angry face", emoji: "😠" },
  run: { said: "running", emoji: "🏃" },
  sleep: { said: "sleeping", emoji: "😴" },
  eat: { said: "eating", emoji: "😋" },
  ball: { said: "a ball", emoji: "⚽" },
  bike: { said: "a bike", emoji: "🚲" },
  kite: { said: "a red kite", emoji: "🪁" },
  park: { said: "the park", emoji: "🏞️" },
  school: { said: "school", emoji: "🏫" },
  store: { said: "the store", emoji: "🏪" },
  car: { said: "in the car", emoji: "🚗" },
  bed: { said: "in bed", emoji: "🛏️" },
  "small-dog": { said: "the small dog", emoji: "🐶", small: true },
  "big-dog": { said: "the big dog", emoji: "🐶" },
  "big-cat": { said: "the big cat", emoji: "🐱" },
  "one-apple": { said: "one apple", emoji: "🍎" },
  "two-apples": { said: "two apples", emoji: "🍎", count: 2 },
  "two-bananas": { said: "two bananas", emoji: "🍌", count: 2 },
  "small-star": { said: "the small star", emoji: "⭐", small: true },
  "big-star": { said: "the big star", emoji: "⭐" },
  "small-moon": { said: "the small moon", emoji: "🌙", small: true },
};

export const INSTRUCTION = "Listen, then tap the right snowball!";

export const LOADING = "Climbing the mountain…";

// Sound tasks also name the three pictures, since the learner must hear their sounds.
export function promptSpeech(kind: Kind, prompt: string, choices: string[]): string {
  if (kind === "sound") return `${prompt} ${choices.map((c) => PICS[c].said).join(", ")}.`;
  return prompt;
}

export function storySpeech(story: string[]): string[] {
  return ["Listen to the story.", ...story];
}

const CHEERS = ["Yes!", "You got it!", "Super listening!", "That's right!", "Way to climb!"];

export function correctSpeech(answer: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${PICS[answer].said}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(answer: string): string {
  return `${REVEAL} ${PICS[answer].said}.`;
}

export const DONE = "You reached the top of the mountain! You got every task right!";

export const DONE_MISSED = "Great climbing! You finished every task. Keep listening and learning.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} right.`;
}
