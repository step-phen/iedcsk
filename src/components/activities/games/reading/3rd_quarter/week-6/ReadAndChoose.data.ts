// Pictures and spoken lines for Read and Choose; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round prints and which pictures it shows come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  pig: { name: "Pig", emoji: "🐷" },
  pin: { name: "Pin", emoji: "📌" },
  pen: { name: "Pen", emoji: "🖊️" },
  hat: { name: "Hat", emoji: "👒" },
  hen: { name: "Hen", emoji: "🐔" },
  bat: { name: "Bat", emoji: "🦇" },
  bed: { name: "Bed", emoji: "🛏️" },
  bag: { name: "Bag", emoji: "👜" },
  bin: { name: "Bin", emoji: "🗑️" },
  van: { name: "Van", emoji: "🚐" },
  six: { name: "Six", emoji: "6️⃣" },
  net: { name: "Net", emoji: "🥅" },
};

export const INSTRUCTION = "Read the word, then tap its picture!";

// The word itself is never spoken before the tap, since reading it is the skill being practised.
export const QUESTION = "Read the word on the map. Which treasure matches it?";

export const NEXT = "Here is a new word to read.";

const CHEERS = ["Ahoy! You read it!", "Treasure found!", "That's right!", "Great reading!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "Ahoy! You read every word and found all the treasure!";

export const DONE_MISSED = "Good work! Keep blending the sounds to read each word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You read ${score} out of ${total} words.`;
}
