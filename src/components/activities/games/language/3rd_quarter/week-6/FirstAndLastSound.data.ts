// Word pictures, letter sounds and spoken lines for First and Last Sound (Bus Stop); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which words a round uses comes from activity_questions; each is spelled the way it sounds, one letter per bus window.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  bed: { name: "bed", emoji: "🛏️" },
  cat: { name: "cat", emoji: "🐱" },
  dog: { name: "dog", emoji: "🐶" },
  pig: { name: "pig", emoji: "🐷" },
  sun: { name: "sun", emoji: "☀️" },
};

// How the speech voice says each letter's sound, so it says the sound and not the letter name.
export const LETTER_SOUNDS: Record<string, string> = {
  b: "buh",
  d: "duh",
  g: "guh",
  m: "mmm",
  n: "nnn",
  p: "puh",
  s: "sss",
  t: "tuh",
};

// Passengers waiting at the stop, one per letter card.
export const PASSENGERS = ["🧒", "👧", "👦"];

export const INSTRUCTION = "Listen, then tap the passenger with the missing sound!";

export const LOADING = "The bus is coming…";

export function promptSpeech(word: string, position: "first" | "last"): string {
  const name = WORDS[word].name;
  return `Listen... ${name}... ${name}. What is the ${position} sound in ${name}?`;
}

const soundLine = (word: string, position: "first" | "last", letter: string) =>
  `${WORDS[word].name} ${position === "first" ? "starts" : "ends"} with ${LETTER_SOUNDS[letter]}`;

export function correctSpeech(word: string, position: "first" | "last", letter: string): string {
  return `Beep beep! ${soundLine(word, position, letter)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(word: string, position: "first" | "last", letter: string): string {
  return `${REVEAL} ${soundLine(word, position, letter)}.`;
}

export const DONE = "Everyone is on the bus! You found every first and last sound!";

export const DONE_MISSED = "Good try! Keep listening for the sound at the start and the end of each word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} sounds.`;
}
