// Pictures and spoken lines for Middle Vowel Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round asks about comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  cat: { name: "Cat", emoji: "🐱" },
  bed: { name: "Bed", emoji: "🛏️" },
  pig: { name: "Pig", emoji: "🐷" },
  map: { name: "Map", emoji: "🗺️" },
  hen: { name: "Hen", emoji: "🐔" },
};

// The three sandwich fillings; sound is how the speech voice says each short vowel.
export const VOWELS = [
  { id: "a", sound: "aah", filling: "cheese" },
  { id: "e", sound: "eh", filling: "tomato" },
  { id: "i", sound: "ih", filling: "lettuce" },
] as const;

export type VowelId = (typeof VOWELS)[number]["id"];

export const INSTRUCTION = "Tap the middle sound!";

export const LISTEN = "Here comes the next sandwich.";

export function promptSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${name}. What sound is in the middle of ${name.toLowerCase()}?`;
}

function soundOf(vowel: string): string {
  return VOWELS.find((v) => v.id === vowel)?.sound ?? vowel;
}

const CHEERS = ["Yum! You got it!", "Yes! Great listening!", "That's right!", "Tasty work!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${WORDS[word].name} has the ${soundOf(word[1])} sound in the middle.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} ${WORDS[word].name} has the ${soundOf(word[1])} sound in the middle.`;
}

export const DONE = "Yum! You found every middle sound!";

export const DONE_MISSED = "Good work! Keep listening for the sound in the middle.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} middle sounds.`;
}
