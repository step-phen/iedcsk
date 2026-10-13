// Pictures and spoken lines for Consonant Hh; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-hh/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Hh", name: "H" };

// Which pictures a round shows and which one is right comes from activity_questions.
export const WORDS: Record<string, { name: string; image: string; isH: boolean }> = {
  hat: { name: "Hat", image: `${ITEMS}/hat.webp`, isH: true },
  hen: { name: "Hen", image: `${ITEMS}/hen.webp`, isH: true },
  horse: { name: "Horse", image: `${ITEMS}/horse.webp`, isH: true },
  house: { name: "House", image: `${ITEMS}/house.webp`, isH: true },
  heart: { name: "Heart", image: `${ITEMS}/heart.webp`, isH: true },
  dog: { name: "Dog", image: `${ITEMS}/dog.webp`, isH: false },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp`, isH: false },
  cup: { name: "Cup", image: `${ITEMS}/cup.webp`, isH: false },
  ball: { name: "Ball", image: `${ITEMS}/ball.webp`, isH: false },
  pig: { name: "Pig", image: `${ITEMS}/pig.webp`, isH: false },
};

export const INSTRUCTION = "Tap the honeycomb that begins with H!";

export const LISTEN = "Buzz, buzz! Listen to the honeycomb.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Honey sweet! You got it!", "Yes! Great listening!", "Hooray!", "That's right!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Buzz, buzz! You found every H picture!";

export const DONE_MISSED = "Good work! Keep listening for the H sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} H pictures.`;
}
