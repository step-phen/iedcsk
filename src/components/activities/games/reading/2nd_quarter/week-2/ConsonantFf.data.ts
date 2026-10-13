// Pictures and spoken lines for Consonant Ff; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/consonant-ff/items";

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const LETTER = { shown: "Ff", name: "F" };

// Which pictures a round shows and which one is right comes from activity_questions.
export const WORDS: Record<string, { name: string; image: string; isF: boolean }> = {
  fish: { name: "Fish", image: `${ITEMS}/fish.webp`, isF: true },
  fan: { name: "Fan", image: `${ITEMS}/fan.webp`, isF: true },
  flower: { name: "Flower", image: `${ITEMS}/flower.webp`, isF: true },
  fork: { name: "Fork", image: `${ITEMS}/fork.webp`, isF: true },
  flag: { name: "Flag", image: `${ITEMS}/flag.webp`, isF: true },
  dog: { name: "Dog", image: `${ITEMS}/dog.webp`, isF: false },
  moon: { name: "Moon", image: `${ITEMS}/moon.webp`, isF: false },
  cup: { name: "Cup", image: `${ITEMS}/cup.webp`, isF: false },
  pig: { name: "Pig", image: `${ITEMS}/pig.webp`, isF: false },
  duck: { name: "Duck", image: `${ITEMS}/duck.webp`, isF: false },
};

export const INSTRUCTION = "Tap the ride that begins with F!";

export const LISTEN = "Here come the rides! Listen.";

export const QUESTION = `Which picture begins with the ${LETTER.name} sound?`;

const CHEERS = ["Wheee! You got it!", "Yes! Great listening!", "That's right!", "Fantastic!", "Super job!"];

export function correctSpeech(word: string, roundIndex: number): string {
  const name = WORDS[word].name;
  return `${CHEERS[roundIndex % CHEERS.length]} ${name} begins with ${LETTER.name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(word: string): string {
  const name = WORDS[word].name;
  return `${REVEAL_TEXT} ${name} begins with ${LETTER.name}.`;
}

export const DONE = "What a fun fair! You found every F picture!";

export const DONE_MISSED = "Good riding! Keep listening for the F sound.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} F pictures.`;
}
