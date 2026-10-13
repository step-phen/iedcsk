// Pictures and spoken lines for Consonant and Word Review; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Letters a sound round can offer, keyed by the lowercase letter the server grades.
export const LETTERS: Record<string, { shown: string; name: string }> = {
  q: { shown: "Qq", name: "Q" },
  r: { shown: "Rr", name: "R" },
  s: { shown: "Ss", name: "S" },
  t: { shown: "Tt", name: "T" },
  v: { shown: "Vv", name: "V" },
  w: { shown: "Ww", name: "W" },
  x: { shown: "Xx", name: "X" },
  y: { shown: "Yy", name: "Y" },
  z: { shown: "Zz", name: "Z" },
};

// Sound-round pictures and word-round pictures come from activity_questions; emoji stand in until the picture art is added.
export const PICTURES: Record<string, { name: string; emoji: string }> = {
  queen: { name: "Queen", emoji: "👸" },
  yoyo: { name: "Yo-yo", emoji: "🪀" },
  box: { name: "Box", emoji: "📦" },
  zebra: { name: "Zebra", emoji: "🦓" },
  volcano: { name: "Volcano", emoji: "🌋" },
};

export const WORDS: Record<string, { name: string; emoji: string }> = {
  cat: { name: "Cat", emoji: "🐱" },
  can: { name: "Can", emoji: "🥫" },
  bed: { name: "Bed", emoji: "🛏️" },
  hat: { name: "Hat", emoji: "🎩" },
  hen: { name: "Hen", emoji: "🐔" },
  pen: { name: "Pen", emoji: "🖊️" },
  map: { name: "Map", emoji: "🗺️" },
  bag: { name: "Bag", emoji: "👜" },
  net: { name: "Net", emoji: "🥅" },
  jet: { name: "Jet", emoji: "✈️" },
  van: { name: "Van", emoji: "🚐" },
};

// How each letter's sound is written for the speech voice, so it says the sound and not the letter name.
export const SOUNDS: Record<string, string> = {
  a: "aah",
  b: "buh",
  c: "kuh",
  d: "duh",
  e: "eh",
  g: "guh",
  h: "huh",
  j: "juh",
  m: "mmm",
  n: "nnn",
  p: "puh",
  t: "tuh",
  v: "vvv",
};

export const INSTRUCTION = "Listen, then tap the right balloon!";

export const LISTEN = "Here comes the next balloon. Listen.";

export function soundQuestion(picture: string, position: "first" | "last"): string {
  return `What sound does ${PICTURES[picture].name} ${position === "first" ? "begin" : "end"} with?`;
}

export const WORD_QUESTION = "Blend the sounds together. Which picture matches the word?";

export function promptLabel(position: "first" | "last"): string {
  return position === "first" ? "Begins with…" : "Ends with…";
}

const CHEERS = ["Up, up, and away!", "Yes! Great listening!", "That's right!", "Super reading!", "Sky high!"];

function soundFact(picture: string, position: "first" | "last", letter: string): string {
  return `${PICTURES[picture].name} ${position === "first" ? "begins" : "ends"} with ${LETTERS[letter].name}.`;
}

export function correctSoundSpeech(picture: string, position: "first" | "last", letter: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${soundFact(picture, position, letter)}`;
}

export function correctWordSpeech(word: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The word is ${WORDS[word].name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSoundSpeech(picture: string, position: "first" | "last", letter: string): string {
  return `${REVEAL_TEXT} ${soundFact(picture, position, letter)}`;
}

export function revealWordSpeech(word: string): string {
  return `${REVEAL_TEXT} The word is ${WORDS[word].name}.`;
}

export const DONE = "What a festival! You got every balloon right!";

export const DONE_MISSED = "Good work! Keep listening to the sounds and blending words.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} balloons.`;
}
