// Sounds, drum colours and spoken lines for Listen and Find the Sound; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Each taught consonant's sound spelled for the speech voice, so it says the sound and not the letter name; tune by ear if one sounds off.
export const SOUNDS: Record<string, string> = {
  B: "buh",
  C: "kuh",
  D: "duh",
  F: "fff",
  G: "guh",
  H: "huh",
  J: "juh",
  K: "kuh",
  L: "lll",
  M: "mmm",
  N: "nnn",
  P: "puh",
};

// One drum colour per spot on the stage, left to right.
export const DRUMS = ["#ff5d8f", "#ffb627", "#3fc1c9"];

export const INSTRUCTION = "Listen to the sound, then tap its drum!";

export const NEXT = "Here comes the next sound!";

export function soundSpeech(letter: string): string {
  const s = SOUNDS[letter];
  return `Listen. ${s}... ${s}. Which letter makes this sound?`;
}

const CHEERS = ["Boom! You got it!", "Yes! Great listening!", "That's right!", "Rock on!", "Super job!"];

export function correctSpeech(letter: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${letter} says ${SOUNDS[letter]}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(letter: string): string {
  return `${REVEAL_TEXT} ${letter} says ${SOUNDS[letter]}.`;
}

export const DONE = "What a show! You found every sound!";

export const DONE_MISSED = "Good work! Keep listening to the letter sounds.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} sounds.`;
}
