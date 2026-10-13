// Pictures, sounds and spoken lines for Mixed Sound Hunt; the shared greeting and intro stay in lib/speech-lines.ts.

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

// Which pictures a round hides and which one is right comes from activity_questions; emoji stand in until the picture art is added.
export const WORDS: Record<string, { name: string; emoji: string; letter: string }> = {
  bee: { name: "Bee", emoji: "🐝", letter: "B" },
  bell: { name: "Bell", emoji: "🔔", letter: "B" },
  goat: { name: "Goat", emoji: "🐐", letter: "G" },
  leaf: { name: "Leaf", emoji: "🍃", letter: "L" },
  juice: { name: "Juice", emoji: "🧃", letter: "J" },
  fox: { name: "Fox", emoji: "🦊", letter: "F" },
  fish: { name: "Fish", emoji: "🐟", letter: "F" },
  moon: { name: "Moon", emoji: "🌙", letter: "M" },
  hat: { name: "Hat", emoji: "🎩", letter: "H" },
  pear: { name: "Pear", emoji: "🍐", letter: "P" },
  pig: { name: "Pig", emoji: "🐷", letter: "P" },
  dog: { name: "Dog", emoji: "🐶", letter: "D" },
  duck: { name: "Duck", emoji: "🦆", letter: "D" },
  nose: { name: "Nose", emoji: "👃", letter: "N" },
};

// One leaf-pile colour mix per spot, left to right.
export const PILES = [
  { a: "#e8590c", b: "#f59f00" },
  { a: "#c92a2a", b: "#f76707" },
  { a: "#d9480f", b: "#fab005" },
];

export const INSTRUCTION = "Listen, then tap the picture with that sound!";

export const NEXT = "Here comes a new sound!";

export function soundSpeech(letter: string): string {
  const s = SOUNDS[letter];
  return `Listen for the sound ${s}... ${s}.`;
}

export function questionSpeech(letter: string): string {
  return `Which picture begins with ${SOUNDS[letter]}?`;
}

const CHEERS = ["Found it!", "Yes! Great hunting!", "That's right!", "Crunch crunch! You got it!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const { name, letter } = WORDS[word];
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${letter}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const { name, letter } = WORDS[word];
  return `${REVEAL_TEXT} ${name} begins with ${letter}.`;
}

export const DONE = "Great hunting! You found every sound!";

export const DONE_MISSED = "Good work! Keep listening for the first sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} pictures.`;
}
