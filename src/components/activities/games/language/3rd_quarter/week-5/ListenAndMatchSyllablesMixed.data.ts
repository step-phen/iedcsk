// Syllable sounds and spoken lines for Listen and Match Syllables: mixed (Bubble Bath); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each taught syllable is written for the speech voice, so it says "mah" and not a word or letter names.
export const SOUNDS: Record<string, string> = {
  ma: "mah", me: "meh", mi: "mee", mo: "moh", mu: "moo",
  sa: "sah", se: "seh", si: "see", so: "soh", su: "soo",
  ba: "bah", be: "beh", bi: "bee", bo: "boh", bu: "boo",
  ta: "tah", te: "teh", ti: "tee", to: "toh", tu: "too",
  la: "lah", le: "leh", li: "lee", lo: "loh", lu: "loo",
};

// Soap tints per bubble, so the three bubbles never look alike.
export const BUBBLE_TINTS = ["#ff8fab", "#74c0fc", "#b197fc"];

export const INSTRUCTION = "Listen, then pop the bubble that says it!";

export const LOADING = "Filling the bathtub…";

/** Only heard, never shown, so the child has to listen for the vowel. */
export function promptSpeech(syllable: string): string {
  return `Listen... ${SOUNDS[syllable]}... ${SOUNDS[syllable]}. Which bubble says ${SOUNDS[syllable]}?`;
}

// A lone capital "A" is read as the word "uh", so the letter a is spelled the way its name sounds.
const letterName = (letter: string) => (letter === "a" ? "Ay" : letter.toUpperCase());

const blend = (syllable: string) => `${letterName(syllable[0])} and ${letterName(syllable[1])} make ${SOUNDS[syllable]}`;

export function correctSpeech(syllable: string): string {
  return `Pop! ${blend(syllable)}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(syllable: string): string {
  return `${REVEAL} ${blend(syllable)}.`;
}

export const DONE = "Squeaky clean! You popped every syllable!";

export const DONE_MISSED = "Good try! Keep listening for the vowel sound: ah, eh, ee, oh, oo.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You popped ${score} out of ${total} bubbles.`;
}
