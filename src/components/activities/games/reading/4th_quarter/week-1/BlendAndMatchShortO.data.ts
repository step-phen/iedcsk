// Pictures and spoken lines for Blend and Match: Short o; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which word a round blends and which pictures it shows come from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string }> = {
  dog: { name: "Dog", emoji: "🐶" },
  pot: { name: "Pot", emoji: "🍲" },
  fox: { name: "Fox", emoji: "🦊" },
  box: { name: "Box", emoji: "📦" },
  log: { name: "Log", emoji: "🪵" },
};

// How each letter's sound is written for the speech voice, so it says the sound and not the letter name.
export const SOUNDS: Record<string, string> = {
  b: "buh",
  d: "duh",
  f: "fff",
  g: "guh",
  l: "luh",
  o: "aw",
  p: "puh",
  t: "tuh",
  x: "ks",
};

export const INSTRUCTION = "Blend the sounds, then tap the ticket!";

export const LISTEN = "All aboard! Listen to the sound in each train car.";

export const QUESTION = "Blend the sounds together. Which ticket shows the word?";

const CHEERS = ["Choo choo! You got it!", "Great blending!", "That's right!", "Full steam ahead!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "Hooray! Your train blended every short o word!";

export const DONE_MISSED = "Good riding! Keep blending the sounds together.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} words.`;
}
