// Pictures and spoken lines for Build the CVC Word; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round builds and how its blocks start comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  hat: { name: "Hat", emoji: "👒" },
  bed: { name: "Bed", emoji: "🛏️" },
  pig: { name: "Pig", emoji: "🐷" },
  van: { name: "Van", emoji: "🚐" },
  hen: { name: "Hen", emoji: "🐔" },
};

export const INSTRUCTION = "Tap the blocks in order to build the word!";

export const LISTEN = "Look at the next picture.";

export function promptSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${name}. Build the word ${name.toLowerCase()}.`;
}

// Capital letters make the speech voice say letter names, so a lone "a" is not read as the word "a".
function spelled(word: string): string {
  return [...word.toUpperCase()].join(", ");
}

const CHEERS = ["Yes! You built it!", "Great building!", "That's right!", "Super spelling!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${spelled(word)}. ${WORDS[word].name}!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} ${WORDS[word].name} is spelled ${spelled(word)}.`;
}

export const DONE = "Hooray! You built every word!";

export const DONE_MISSED = "Good work! Keep listening to each sound as you build.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You built ${score} out of ${total} words.`;
}
