// Pictures and spoken lines for Blend and Match: Short a; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round blends and which pictures it shows come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  cat: { name: "Cat", emoji: "🐱" },
  can: { name: "Can", emoji: "🥫" },
  cap: { name: "Cap", emoji: "🧢" },
  map: { name: "Map", emoji: "🗺️" },
  man: { name: "Man", emoji: "👨" },
  bag: { name: "Bag", emoji: "👜" },
  bat: { name: "Bat", emoji: "🦇" },
  van: { name: "Van", emoji: "🚐" },
  pan: { name: "Pan", emoji: "🍳" },
  hat: { name: "Hat", emoji: "🎩" },
  rat: { name: "Rat", emoji: "🐀" },
};

// How each letter's sound is written for the speech voice, so it says the sound and not the letter name.
export const SOUNDS: Record<string, string> = {
  a: "aah",
  b: "buh",
  c: "kuh",
  g: "guh",
  h: "huh",
  m: "mmm",
  n: "nnn",
  p: "puh",
  r: "rrr",
  t: "tuh",
  v: "vvv",
};

export const INSTRUCTION = "Blend the sounds, then drag the word to its picture!";

export const LISTEN = "Clack, clack! Listen to the magnets.";

export const QUESTION = "Blend the sounds together. Drag the word to its picture!";

const CHEERS = ["Snap! You blended it!", "Great blending!", "That's right!", "Super reading!", "Fantastic!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "The fridge is full! You blended every short a word!";

export const DONE_MISSED = "Good work! Keep blending the sounds together.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} words.`;
}
