// Pictures and spoken lines for Consonant Sound Challenge; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Emoji stand in for the word pictures until drawn art is added.
export const PICTURES: Record<string, string> = {
  bus: "🚌",
  hen: "🐔",
  fox: "🦊",
  web: "🕸️",
  pig: "🐷",
};

export type Position = "beginning" | "ending";

export const INSTRUCTION = "Listen, then shoot for the hoop with the sound!";

export function questionSpeech(word: string, position: Position): string {
  return `${word}. Which letter makes the ${position} sound of ${word}?`;
}

function soundLine(word: string, position: Position, letter: string): string {
  return `${word} ${position === "beginning" ? "begins" : "ends"} with ${letter.toUpperCase()}.`;
}

const CHEERS = ["Swish! Nice shot!", "Score!", "Slam dunk!", "Great listening!", "Nothing but net!"];

export function correctSpeech(word: string, position: Position, letter: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${soundLine(word, position, letter)}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string, position: Position, letter: string): string {
  return `${REVEAL_TEXT} ${soundLine(word, position, letter)}`;
}

export const DONE = "Champion! You found every beginning and ending sound!";

export const DONE_MISSED = "Good game! Keep listening for the first and last sounds.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You scored ${score} out of ${total} baskets.`;
}
