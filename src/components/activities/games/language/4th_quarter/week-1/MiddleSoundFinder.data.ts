// Pictures, vowel sounds and spoken lines for Middle Sound Finder; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round uses comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  cap: { name: "Cap", emoji: "🧢" },
  web: { name: "Web", emoji: "🕸️" },
  pin: { name: "Pin", emoji: "📌" },
  dog: { name: "Dog", emoji: "🐶" },
  bus: { name: "Bus", emoji: "🚌" },
};

// How the speech voice says each short vowel, so it says the sound and not the letter name.
export const VOWEL_SOUNDS: Record<string, string> = {
  a: "aah",
  e: "eh",
  i: "ih",
  o: "aw",
  u: "uh",
};

// One leaf shade per spot, so the right leaf is never told apart by color.
export const LEAF_COLORS = ["#7ccc56", "#a3d65c", "#5fb87a"];

export const INSTRUCTION = "Listen, then tap the middle sound!";

export const LOADING = "Waking up the caterpillar…";

export function promptSpeech(word: string): string {
  return `${WORDS[word].name}... ${word}. What sound is in the middle of ${word}?`;
}

const CHEERS = ["Yes!", "Great listening!", "You found it!", "Munch, munch!", "Super!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${WORDS[word].name} has ${VOWEL_SOUNDS[word[1]]} in the middle.`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL} ${WORDS[word].name} has ${VOWEL_SOUNDS[word[1]]} in the middle.`;
}

export const DONE = "The caterpillar is so happy! You found every middle sound!";

export const DONE_MISSED = "Good try! Keep listening for the sound in the middle.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} middle sounds.`;
}
