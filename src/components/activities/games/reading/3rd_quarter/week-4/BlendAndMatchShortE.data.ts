// Pictures and spoken lines for Blend and Match: Short e; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round blends and which pictures it shows come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  hen: { name: "Hen", emoji: "🐔" },
  pen: { name: "Pen", emoji: "🖊️" },
  net: { name: "Net", emoji: "🥅" },
  bed: { name: "Bed", emoji: "🛏️" },
  jet: { name: "Jet", emoji: "✈️" },
  web: { name: "Web", emoji: "🕸️" },
  ten: { name: "Ten", emoji: "🔟" },
};

// How each letter's sound is written for the speech voice, so it says the sound and not the letter name.
export const SOUNDS: Record<string, string> = {
  b: "buh",
  d: "duh",
  e: "eh",
  h: "huh",
  j: "juh",
  n: "nnn",
  p: "puh",
  t: "tuh",
  w: "wuh",
};

export const INSTRUCTION = "Blend the sounds, then tap the picture!";

export const LISTEN = "Cluck, cluck! The eggs are hatching. Listen.";

export const QUESTION = "Blend the sounds together. Which picture matches the word?";

const CHEERS = ["Egg-cellent!", "Great blending!", "That's right!", "Super reading!", "Fantastic!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "The hens are proud! You blended every short e word!";

export const DONE_MISSED = "Good work! Keep blending the sounds together.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} words.`;
}
