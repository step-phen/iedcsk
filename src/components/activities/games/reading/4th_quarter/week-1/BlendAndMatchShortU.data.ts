// Pictures and spoken lines for Blend and Match: Short u; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round blends and which pictures it shows come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  sun: { name: "Sun", emoji: "☀️" },
  cup: { name: "Cup", emoji: "☕" },
  bus: { name: "Bus", emoji: "🚌" },
  bug: { name: "Bug", emoji: "🐛" },
  nut: { name: "Nut", emoji: "🥜" },
  tub: { name: "Tub", emoji: "🛁" },
  hut: { name: "Hut", emoji: "🛖" },
};

// How each letter's sound is written for the speech voice, so it says the sound and not the letter name.
export const SOUNDS: Record<string, string> = {
  b: "buh",
  c: "kuh",
  g: "guh",
  h: "huh",
  n: "nnn",
  p: "puh",
  s: "sss",
  t: "tuh",
  u: "uh",
};

export const INSTRUCTION = "Blend the sounds, then tap the planet!";

export const LISTEN = "Look at the stars. Listen to the sound on each one.";

export const QUESTION = "Blend the sounds together. Which planet shows the word?";

const CHEERS = ["Blast off! You got it!", "Out of this world!", "That's right!", "Super blending!", "Well done, space reader!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "Amazing! You blended every short u word in space!";

export const DONE_MISSED = "Good flying! Keep blending the sounds together.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} words.`;
}
