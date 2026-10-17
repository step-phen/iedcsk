// Callers, reply sentences and spoken lines for Conversation Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Every reply the chips can hold.
export const REPLIES: Record<string, string> = {
  fine: "I am fine, thank you!",
  "cat-bed": "The cat is under the bed.",
  "red-ball": "I have a red ball.",
  "lets-play": "Yes, let's play!",
  "blue-shoes": "My shoes are blue.",
  "good-night": "Good night!",
  "thank-you": "Thank you so much!",
  five: "I am five years old.",
  "rice-fish": "I want rice and fish, please.",
  "bag-chair": "My bag is on the chair.",
};

// Who calls and what they say; "reply" is the one reply that fits.
export const CALLS: Record<string, { name: string; face: string; tint: string; line: string; reply: string }> = {
  "how-are-you": { name: "Grandma", face: "👵", tint: "#fde68a", line: "Good morning! How are you?", reply: "fine" },
  play: { name: "Sam", face: "👦", tint: "#bfdbfe", line: "Do you want to play with me?", reply: "lets-play" },
  gift: { name: "Auntie", face: "👱‍♀️", tint: "#fbcfe8", line: "Happy birthday! Here is a gift for you!", reply: "thank-you" },
  eat: { name: "Mom", face: "👩", tint: "#fed7aa", line: "What do you want to eat?", reply: "rice-fish" },
  bag: { name: "Teacher", face: "👩‍🏫", tint: "#bbf7d0", line: "Where is your bag?", reply: "bag-chair" },
};

export const INSTRUCTION = "Listen, then tap the reply that makes sense!";

export const LOADING = "Charging the phone…";

export function promptSpeech(call: string): string {
  const { name, line } = CALLS[call];
  return `${name} says: ${line} What will you say back?`;
}

export function choiceSpeech(index: number, reply: string): string {
  return `Reply ${index + 1}. ${REPLIES[reply]}`;
}

const CHEERS = ["Nice talking!", "That makes sense!", "Great reply!", "That's right!", "Well said!"];

export function correctSpeech(call: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${REPLIES[CALLS[call].reply]}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(call: string): string {
  return `${REVEAL} ${REPLIES[CALLS[call].reply]}`;
}

export const DONE = "You are a great talker! Every reply made sense!";

export const DONE_MISSED = "Good try! Listen to what they say, then answer about it.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You chose ${score} out of ${total} right.`;
}
