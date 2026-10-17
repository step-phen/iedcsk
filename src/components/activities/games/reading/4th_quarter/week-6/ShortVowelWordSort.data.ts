// Spoken lines for Short Vowel Word Sort; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const VOWELS = ["a", "e", "i", "o", "u"];

// Each locker gets its own door color so the five read apart at a glance.
export const LOCKER_COLORS: Record<string, string> = {
  a: "#ef4444",
  e: "#f59e0b",
  i: "#22c55e",
  o: "#3b82f6",
  u: "#a855f7",
};

export const INSTRUCTION = "Read the word, then tap the locker with its vowel!";

export const QUESTION = "Read the word. Which vowel sound is in the middle?";

function vowelLine(word: string, vowel: string): string {
  return `${word} has the short ${vowel.toUpperCase()} sound.`;
}

const CHEERS = ["Clang! Locked in!", "Great sorting!", "That's right!", "Super reader!", "Well done!"];

export function correctSpeech(word: string, vowel: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${vowelLine(word, vowel)}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string, vowel: string): string {
  return `${REVEAL_TEXT} ${vowelLine(word, vowel)}`;
}

export const DONE = "Wow! You sorted every word into the right locker!";

export const DONE_MISSED = "Good work! Look at the middle letter and say its sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You sorted ${score} out of ${total} words.`;
}
