// Pictures and spoken lines for Consonant Gg; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-gg/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Gg", name: "G" };

// Which pictures a round shows and which one is right comes from activity_questions; `isG` marks hard-G words only.
export const WORDS: Record<string, { name: string; image: string; isG: boolean }> = {
  gift: { name: "Gift", image: `${ITEMS}/gift.webp`, isG: true },
  grapes: { name: "Grapes", image: `${ITEMS}/grapes.webp`, isG: true },
  guitar: { name: "Guitar", image: `${ITEMS}/guitar.webp`, isG: true },
  glasses: { name: "Glasses", image: `${ITEMS}/glasses.webp`, isG: true },
  gate: { name: "Gate", image: `${ITEMS}/gate.webp`, isG: true },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp`, isG: false },
  ball: { name: "Ball", image: `${ITEMS}/ball.webp`, isG: false },
  fish: { name: "Fish", image: `${ITEMS}/fish.webp`, isG: false },
  owl: { name: "Owl", image: `${ITEMS}/owl.webp`, isG: false },
  pig: { name: "Pig", image: `${ITEMS}/pig.webp`, isG: false },
};

export const INSTRUCTION = "Tap the gumball that begins with G!";

export const LISTEN = "Clink, clink! Listen to the gumballs.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Great job!", "Yes! Great listening!", "You got it!", "That's right!", "Super good!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Gumball party! You found every G picture!";

export const DONE_MISSED = "Good going! Keep listening for the G sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} G pictures.`;
}
