// Pictures, rhyme endings and spoken lines for Rhyme Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// rime is the ending sound two names share when they rhyme; which word and choices a round uses come from activity_questions.
export const WORDS: Record<string, { name: string; emoji: string; rime: string }> = {
  cat: { name: "cat", emoji: "🐱", rime: "at" },
  hat: { name: "hat", emoji: "🎩", rime: "at" },
  frog: { name: "frog", emoji: "🐸", rime: "og" },
  log: { name: "log", emoji: "🪵", rime: "og" },
  bee: { name: "bee", emoji: "🐝", rime: "ee" },
  tree: { name: "tree", emoji: "🌳", rime: "ee" },
  moon: { name: "moon", emoji: "🌙", rime: "oon" },
  spoon: { name: "spoon", emoji: "🥄", rime: "oon" },
  goat: { name: "goat", emoji: "🐐", rime: "oat" },
  boat: { name: "boat", emoji: "⛵", rime: "oat" },
  sun: { name: "sun", emoji: "☀️", rime: "un" },
  book: { name: "book", emoji: "📖", rime: "ook" },
  ball: { name: "ball", emoji: "⚽", rime: "all" },
  cup: { name: "cup", emoji: "☕", rime: "up" },
  duck: { name: "duck", emoji: "🦆", rime: "uck" },
  bed: { name: "bed", emoji: "🛏️", rime: "ed" },
  pig: { name: "pig", emoji: "🐷", rime: "ig" },
  bus: { name: "bus", emoji: "🚌", rime: "us" },
  egg: { name: "egg", emoji: "🥚", rime: "eg" },
};

// A short rhyme said once the pair is matched, so the child hears the two words ring together.
export const RHYMES: Record<string, string> = {
  cat: "The cat has a hat!",
  frog: "The frog sits on a log!",
  bee: "The bee is in the tree!",
  moon: "Hey diddle diddle, the moon and the spoon!",
  goat: "The goat rides a boat!",
};

export const ROCKET_COLORS = ["#ff6b6b", "#ffd43b", "#69db7c"];

export const INSTRUCTION = "Fly the rocket that rhymes to the planet!";

export const LOADING = "Counting down… 3, 2, 1…";

export function promptSpeech(word: string, choices: string[]): string {
  const names = choices.map((c) => WORDS[c].name);
  return `${WORDS[word].name}. Which one rhymes with ${WORDS[word].name}? ${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}?`;
}

const CHEERS = ["Blast off!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(word: string, answer: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${WORDS[word].name}, ${WORDS[answer].name}. ${RHYMES[word] ?? ""}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(word: string, answer: string): string {
  return `${REVEAL} ${WORDS[word].name} and ${WORDS[answer].name} rhyme.`;
}

export const DONE = "Rhyme astronaut! You matched every rhyme!";

export const DONE_MISSED = "Good flying! Keep listening for words that sound the same at the end.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} rhymes.`;
}
