// Pictures and spoken lines for CVC Picture Hunt; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round prints and which pictures it hides come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  cap: { name: "Cap", emoji: "🧢" },
  cat: { name: "Cat", emoji: "🐱" },
  map: { name: "Map", emoji: "🗺️" },
  can: { name: "Can", emoji: "🥫" },
  hat: { name: "Hat", emoji: "👒" },
  van: { name: "Van", emoji: "🚐" },
  hen: { name: "Hen", emoji: "🐔" },
  pen: { name: "Pen", emoji: "🖊️" },
  ten: { name: "Ten", emoji: "🔟" },
  leg: { name: "Leg", emoji: "🦵" },
  bed: { name: "Bed", emoji: "🛏️" },
  web: { name: "Web", emoji: "🕸️" },
  net: { name: "Net", emoji: "🥅" },
  pig: { name: "Pig", emoji: "🐷" },
  pin: { name: "Pin", emoji: "📌" },
  six: { name: "Six", emoji: "6️⃣" },
  lip: { name: "Lip", emoji: "👄" },
};

export const INSTRUCTION = "Read the word, then find its picture!";

// The word itself is never spoken before the tap, since reading it is the skill being practised.
export const FIRST_QUESTION = "Read the word on the jungle sign. Which picture in the bushes matches it?";

export const NEXT_QUESTION = "Here is a new word on the sign. Read it, then find its picture.";

const CHEERS = ["You found it!", "Yes! Great reading!", "That's right!", "Super hunting!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "What a great hunt! You read every word and found every picture!";

export const DONE_MISSED = "Good hunting! Keep blending the sounds to read each word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} pictures.`;
}
