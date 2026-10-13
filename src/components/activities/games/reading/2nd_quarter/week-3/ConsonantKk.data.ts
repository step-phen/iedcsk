// Pictures and spoken lines for Consonant Kk; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-kk/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Kk", name: "K" };

// Which pictures a round shows and which one is right comes from activity_questions.
export const WORDS: Record<string, { name: string; image: string; isK: boolean }> = {
  key: { name: "Key", image: `${ITEMS}/key.webp`, isK: true },
  kite: { name: "Kite", image: `${ITEMS}/kite.webp`, isK: true },
  kettle: { name: "Kettle", image: `${ITEMS}/kettle.webp`, isK: true },
  king: { name: "King", image: `${ITEMS}/king.webp`, isK: true },
  koala: { name: "Koala", image: `${ITEMS}/koala.webp`, isK: true },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp`, isK: false },
  dog: { name: "Dog", image: `${ITEMS}/dog.webp`, isK: false },
  moon: { name: "Moon", image: `${ITEMS}/moon.webp`, isK: false },
  hen: { name: "Hen", image: `${ITEMS}/hen.webp`, isK: false },
  pig: { name: "Pig", image: `${ITEMS}/pig.webp`, isK: false },
};

export const INSTRUCTION = "Tap the pot that begins with K!";

export const LISTEN = "Something is cooking! Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Yum! You got it!", "Yes! Great listening!", "That's right!", "Super cook!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Ding! You cooked up every K picture!";

export const DONE_MISSED = "Good cooking! Keep listening for the K sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} K pictures.`;
}
