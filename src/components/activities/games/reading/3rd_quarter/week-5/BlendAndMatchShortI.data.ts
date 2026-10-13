// Pictures and spoken lines for Blend and Match: Short i; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round blends and which pictures it shows come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  pig: { name: "Pig", emoji: "🐷" },
  pin: { name: "Pin", emoji: "📌" },
  lip: { name: "Lip", emoji: "👄" },
  kid: { name: "Kid", emoji: "🧒" },
  bin: { name: "Bin", emoji: "🗑️" },
  six: { name: "Six", emoji: "6️⃣" },
};

// How each letter's sound is written for the speech voice, so it says the sound and not the letter name.
export const SOUNDS: Record<string, string> = {
  b: "buh",
  d: "duh",
  g: "guh",
  i: "ih",
  k: "kuh",
  l: "luh",
  n: "nnn",
  p: "puh",
};

export const INSTRUCTION = "Blend the sounds, then tap the picture!";

export const LISTEN = "Listen to the sounds on the beads.";

export const QUESTION = "Blend the sounds together. Which picture matches the word?";

const CHEERS = ["Yes! You blended it!", "Great blending!", "That's right!", "Super reading!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "Wow! You blended every short i word!";

export const DONE_MISSED = "Good work! Keep blending the sounds together.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} words.`;
}
