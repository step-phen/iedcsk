// Sock colours and spoken lines for Consonant Partners; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// The consonants taught this quarter; every sock carries one of these.
export const LETTERS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P"];

// One sock per peg on the line, so neighbouring socks never look alike; the big sock in the basket keeps its own colour.
export const SOCKS = [
  { body: "#ff9eb5", stripe: "#e2557a" },
  { body: "#8fd3ff", stripe: "#2f8fd1" },
  { body: "#b6e388", stripe: "#5fa52d" },
];

export const BIG_SOCK = { body: "#ffd45c", stripe: "#e89a1c" };

export const INSTRUCTION = "Tap the sock with the small letter partner!";

// Capital letters make the speech voice say letter names, so a lone "b" is never read as a word.
export function questionSpeech(letter: string): string {
  return `Here is big ${letter}. Which sock has small ${letter}?`;
}

export const NEXT = "Here comes another sock!";

const CHEERS = ["A perfect pair!", "Yes! They match!", "That's right!", "Sock pals!", "Super matching!"];

export function correctSpeech(letter: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} Big ${letter} and small ${letter} are partners.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(letter: string): string {
  return `${REVEAL_TEXT} Big ${letter} and small ${letter} are partners.`;
}

export const DONE = "Laundry done! You matched every sock pair!";

export const DONE_MISSED = "Good work! Keep looking at the big and small letters.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} letter partners.`;
}
