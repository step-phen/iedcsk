// Syllables, first sounds, pictures and spoken lines for Sound and Syllable Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// How each taught syllable is written for the speech voice, so it says "mah" and not a word or letter names.
export const SYLLABLES: Record<string, string> = {
  ma: "mah", me: "meh", mi: "mee", mo: "moh", mu: "moo",
  sa: "sah", se: "seh", si: "see", so: "soh", su: "soo",
  ba: "bah", be: "beh", bi: "bee", bo: "boh", bu: "boo",
  ta: "tah", te: "teh", ti: "tee", to: "toh", tu: "too",
  la: "lah", le: "leh", li: "lee", lo: "loh", lu: "loo",
};

// How each taught letter's sound is written for the speech voice.
export const LETTER_SOUNDS: Record<string, string> = {
  m: "mmm",
  s: "sss",
  b: "buh",
  t: "tuh",
  l: "lll",
};

// Pictures for sound rounds; first is the letter the name begins with. Which word a round uses comes from activity_questions.
export const WORDS: Record<string, { name: string; emoji: string; first: string }> = {
  moon: { name: "moon", emoji: "🌙", first: "m" },
  ball: { name: "ball", emoji: "⚽", first: "b" },
  sun: { name: "sun", emoji: "☀️", first: "s" },
  lion: { name: "lion", emoji: "🦁", first: "l" },
  tiger: { name: "tiger", emoji: "🐯", first: "t" },
};

// Xylophone bars, longest to shortest, each its own rainbow color.
export const BAR_COLORS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c"];

export const INSTRUCTION = "Listen, then tap the bar that matches!";

export const LOADING = "Tuning the xylophone…";

/** The syllable is only heard, never shown, so the child has to listen. */
export function syllablePrompt(syllable: string): string {
  return `Listen... ${SYLLABLES[syllable]}... ${SYLLABLES[syllable]}. Which bar says ${SYLLABLES[syllable]}?`;
}

export function soundPrompt(word: string): string {
  return `${WORDS[word].name}. What sound does ${WORDS[word].name} begin with?`;
}

// A lone capital "A" is read as the word "uh", so the letter a is spelled the way its name sounds.
const letterName = (letter: string) => (letter === "a" ? "Ay" : letter.toUpperCase());

function explain(round: { kind: "syllable" | "sound"; target: string; word?: string }): string {
  if (round.kind === "syllable") return `${letterName(round.target[0])} and ${letterName(round.target[1])} make ${SYLLABLES[round.target]}.`;
  return `${WORDS[round.word!].name} begins with ${LETTER_SOUNDS[round.target]}, the letter ${letterName(round.target)}.`;
}

const CHEERS = ["Ding!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(round: { kind: "syllable" | "sound"; target: string; word?: string }, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${explain(round)}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(round: { kind: "syllable" | "sound"; target: string; word?: string }): string {
  return `${REVEAL} ${explain(round)}`;
}

export const DONE = "What a song! You matched every sound!";

export const DONE_MISSED = "Nice playing! Keep listening closely to every sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} sounds.`;
}
