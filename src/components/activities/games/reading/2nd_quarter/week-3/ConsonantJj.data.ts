// Pictures and spoken lines for Consonant Jj; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-jj/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Jj", name: "J" };

// Which pictures a round shows and which one is right comes from activity_questions.
export const WORDS: Record<string, { name: string; image: string; isJ: boolean }> = {
  jar: { name: "Jar", image: `${ITEMS}/jar.webp`, isJ: true },
  juice: { name: "Juice", image: `${ITEMS}/juice.webp`, isJ: true },
  jacket: { name: "Jacket", image: `${ITEMS}/jacket.webp`, isJ: true },
  jellyfish: { name: "Jellyfish", image: `${ITEMS}/jellyfish.webp`, isJ: true },
  "jump-rope": { name: "Jump rope", image: `${ITEMS}/jump-rope.webp`, isJ: true },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp`, isJ: false },
  fish: { name: "Fish", image: `${ITEMS}/fish.webp`, isJ: false },
  cow: { name: "Cow", image: `${ITEMS}/cow.webp`, isJ: false },
  moon: { name: "Moon", image: `${ITEMS}/moon.webp`, isJ: false },
  pig: { name: "Pig", image: `${ITEMS}/pig.webp`, isJ: false },
};

export const INSTRUCTION = "Tap the toy box that begins with J!";

export const LISTEN = "Pop, pop! Listen to the toy boxes.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Pop! You got it!", "Yes! Great listening!", "That's right!", "Jolly good!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Pop goes the box! You found every J picture!";

export const DONE_MISSED = "Good playing! Keep listening for the J sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} J pictures.`;
}
