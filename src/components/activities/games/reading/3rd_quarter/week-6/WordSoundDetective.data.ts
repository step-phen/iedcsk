// Pictures and spoken lines for Word Sound Detective; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round asks about and which letters it offers come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  cat: { name: "Cat", emoji: "🐱" },
  bed: { name: "Bed", emoji: "🛏️" },
  pig: { name: "Pig", emoji: "🐷" },
  hen: { name: "Hen", emoji: "🐔" },
  map: { name: "Map", emoji: "🗺️" },
};

export type Position = "beginning" | "ending";

export const POSITION_LABEL: Record<Position, string> = { beginning: "First sound", ending: "Last sound" };

export const INSTRUCTION = "Listen, then tap the letter you hear!";

export const LISTEN = "Detective, here is your next clue.";

function verb(position: Position): string {
  return position === "beginning" ? "begin" : "end";
}

export function promptSpeech(word: string, position: Position): string {
  const name = WORDS[word].name;
  return `${name}. What letter does ${name.toLowerCase()} ${verb(position)} with?`;
}

const CHEERS = ["Case solved!", "Great detective work!", "That's right!", "Sharp ears!", "Well done!"];

// Capital letters make the speech voice say the letter name.
export function correctSpeech(word: string, position: Position, letter: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${WORDS[word].name} ${verb(position)}s with ${letter.toUpperCase()}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string, position: Position, letter: string): string {
  return `${REVEAL_TEXT} ${WORDS[word].name} ${verb(position)}s with ${letter.toUpperCase()}.`;
}

export const DONE = "Case closed! You found every sound!";

export const DONE_MISSED = "Good work, detective! Keep listening to the first and last sounds.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You solved ${score} out of ${total} clues.`;
}
