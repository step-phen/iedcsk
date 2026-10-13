// Pictures and spoken lines for Consonant Cc; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-cc/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Cc", name: "C" };

// Which pictures a round shows and which one is right comes from activity_questions; `isC` marks hard-C words only.
export const WORDS: Record<string, { name: string; image: string; isC: boolean }> = {
  cat: { name: "Cat", image: `${ITEMS}/cat.webp`, isC: true },
  cup: { name: "Cup", image: `${ITEMS}/cup.webp`, isC: true },
  car: { name: "Car", image: `${ITEMS}/car.webp`, isC: true },
  cow: { name: "Cow", image: `${ITEMS}/cow.webp`, isC: true },
  crayons: { name: "Crayons", image: `${ITEMS}/crayons.webp`, isC: true },
  pig: { name: "Pig", image: `${ITEMS}/pig.webp`, isC: false },
  egg: { name: "Egg", image: `${ITEMS}/egg.webp`, isC: false },
  hen: { name: "Hen", image: `${ITEMS}/hen.webp`, isC: false },
  sheep: { name: "Sheep", image: `${ITEMS}/sheep.webp`, isC: false },
  horse: { name: "Horse", image: `${ITEMS}/horse.webp`, isC: false },
};

export const INSTRUCTION = "Tap the window that begins with C!";

export const LISTEN = "Knock, knock! Listen to the windows.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Hooray for the castle!", "Yes! Great listening!", "You got it!", "That's right!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "The castle is glowing! You found every C picture!";

export const DONE_MISSED = "Nice work! Keep listening for the C sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} C pictures.`;
}
