// Pictures and spoken lines for Consonant Dd; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-dd/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Dd", name: "D" };

// Which pictures a round shows and which one is right comes from activity_questions.
export const WORDS: Record<string, { name: string; image: string; isD: boolean }> = {
  dog: { name: "Dog", image: `${ITEMS}/dog.webp`, isD: true },
  duck: { name: "Duck", image: `${ITEMS}/duck.webp`, isD: true },
  drum: { name: "Drum", image: `${ITEMS}/drum.webp`, isD: true },
  door: { name: "Door", image: `${ITEMS}/door.webp`, isD: true },
  donut: { name: "Donut", image: `${ITEMS}/donut.webp`, isD: true },
  monkey: { name: "Monkey", image: `${ITEMS}/monkey.webp`, isD: false },
  mouse: { name: "Mouse", image: `${ITEMS}/mouse.webp`, isD: false },
  owl: { name: "Owl", image: `${ITEMS}/owl.webp`, isD: false },
  hen: { name: "Hen", image: `${ITEMS}/hen.webp`, isD: false },
  sun: { name: "Sun", image: `${ITEMS}/sun.webp`, isD: false },
};

export const INSTRUCTION = "Dig! Tap the picture that begins with D!";

export const LISTEN = "Dig, dig, dig! Listen to what we found.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Great digging!", "Yes! Great listening!", "You found it!", "That's right!", "Dino-mite!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "Roar! You dug up every D picture!";

export const DONE_MISSED = "Good digging! Keep listening for the D sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You dug up ${score} out of ${total} D pictures.`;
}
