// Pictures and spoken lines for CVC Word Mix; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Emoji stand in for the word pictures until drawn art is added.
export const PICTURES: Record<string, string> = {
  cap: "🧢",
  cat: "🐱",
  cup: "🥤",
  bed: "🛏️",
  bag: "👜",
  bus: "🚌",
  pan: "🍳",
  pen: "🖊️",
  pig: "🐷",
  leg: "🦵",
  log: "🪵",
  lip: "👄",
  nut: "🥜",
  net: "🥅",
  hut: "🛖",
};

export const INSTRUCTION = "Read the robot's word, then tap its picture!";

export const LISTEN = "Beep boop! The robot has a new word. Read it!";

export const QUESTION = "Which screen shows the word?";

const CHEERS = ["Beep beep! You got it!", "Robot power!", "Great reading!", "Zap! That's right!", "Super reader!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${word}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${word}.`;
}

export const DONE = "Amazing! You read every word and powered up the robot!";

export const DONE_MISSED = "Good work! Keep blending every sound in the word.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You read ${score} out of ${total} words.`;
}
