// Pictures and spoken lines for Consonant Bb; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-bb/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Bb", name: "B" };

// Which pictures a round shows and which one is right comes from activity_questions.
export const WORDS: Record<string, { name: string; image: string; isB: boolean }> = {
  ball: { name: "Ball", image: `${ITEMS}/ball.webp`, isB: true },
  banana: { name: "Banana", image: `${ITEMS}/banana.webp`, isB: true },
  basket: { name: "Basket", image: `${ITEMS}/basket.webp`, isB: true },
  balloon: { name: "Balloon", image: `${ITEMS}/balloon.webp`, isB: true },
  butterfly: { name: "Butterfly", image: `${ITEMS}/butterfly.webp`, isB: true },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp`, isB: false },
  fish: { name: "Fish", image: `${ITEMS}/fish.webp`, isB: false },
  moon: { name: "Moon", image: `${ITEMS}/moon.webp`, isB: false },
  hat: { name: "Hat", image: `${ITEMS}/hat.webp`, isB: false },
  star: { name: "Star", image: `${ITEMS}/star.webp`, isB: false },
};

export const INSTRUCTION = "Pop the bubble that begins with B!";

export const LISTEN = "Listen to the bubbles!";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Pop! You got it!", "Yes! Great listening!", "Pop! That's right!", "Super popping!", "Well done!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Pop, pop, pop! You found every B bubble!";

export const DONE_MISSED = "Good work! Keep listening for the B sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You popped ${score} out of ${total} B bubbles.`;
}
