// Pictures, trucks and spoken lines for Consonant Picture Sort; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// The consonants taught this quarter; every truck carries one of these.
export const LETTERS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P"];

// Which picture a round shows comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; letter: string }> = {
  pig: { name: "Pig", emoji: "🐷", letter: "P" },
  pen: { name: "Pen", emoji: "🖊️", letter: "P" },
  dog: { name: "Dog", emoji: "🐶", letter: "D" },
  duck: { name: "Duck", emoji: "🦆", letter: "D" },
  moon: { name: "Moon", emoji: "🌙", letter: "M" },
  mouse: { name: "Mouse", emoji: "🐭", letter: "M" },
};

// One cab colour per truck, left to right.
export const CABS = ["#ff8c42", "#4fa3e0", "#9b5de5"];

export const INSTRUCTION = "Drag the picture to the truck with its first letter!";

export const NEXT = "Here comes the next load!";

export function promptSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${name}. Which truck does ${name.toLowerCase()} go in?`;
}

const CHEERS = ["Beep beep! You got it!", "Yes! Great sorting!", "That's right!", "Load it up!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const { name, letter } = WORDS[word];
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${letter}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const { name, letter } = WORDS[word];
  return `${REVEAL_TEXT} ${name} begins with ${letter}.`;
}

export const DONE = "Beep beep! Every picture is in the right truck!";

export const DONE_MISSED = "Good work! Keep listening for the first sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You sorted ${score} out of ${total} pictures.`;
}
