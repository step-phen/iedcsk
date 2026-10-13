// Pictures and spoken lines for Consonant Ll; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-ll/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Ll", name: "L" };

// Which pictures a round shows and which one is right comes from activity_questions.
export const WORDS: Record<string, { name: string; image: string; isL: boolean }> = {
  ladybug: { name: "Ladybug", image: `${ITEMS}/ladybug.webp`, isL: true },
  leaf: { name: "Leaf", image: `${ITEMS}/leaf.webp`, isL: true },
  lemon: { name: "Lemon", image: `${ITEMS}/lemon.webp`, isL: true },
  lollipop: { name: "Lollipop", image: `${ITEMS}/lollipop.webp`, isL: true },
  lamp: { name: "Lamp", image: `${ITEMS}/lamp.webp`, isL: true },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp`, isL: false },
  fish: { name: "Fish", image: `${ITEMS}/fish.webp`, isL: false },
  dog: { name: "Dog", image: `${ITEMS}/dog.webp`, isL: false },
  hat: { name: "Hat", image: `${ITEMS}/hat.webp`, isL: false },
  cup: { name: "Cup", image: `${ITEMS}/cup.webp`, isL: false },
};

export const INSTRUCTION = "Tap the lantern that begins with L!";

export const LISTEN = "Look at the lanterns light up! Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Bright! You got it!", "Yes! Great listening!", "That's right!", "Lovely!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "The lanterns are glowing! You found every L picture!";

export const DONE_MISSED = "Good work! Keep listening for the L sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} L pictures.`;
}
