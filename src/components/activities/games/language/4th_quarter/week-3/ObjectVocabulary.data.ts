// Store items, their describing words and spoken lines for Object Vocabulary; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// words are the describing words shown as tags; clue is the full sentence read aloud. Which item a round asks for comes from activity_questions.
export const ITEMS: Record<string, { name: string; emoji: string; words: string[]; clue: string }> = {
  apple: { name: "apple", emoji: "🍎", words: ["red", "round", "crunchy"], clue: "It is red and round. It is sweet and crunchy." },
  icecream: { name: "ice cream", emoji: "🍦", words: ["cold", "sweet", "melts"], clue: "It is cold and sweet. It melts in the sun." },
  lemon: { name: "lemon", emoji: "🍋", words: ["small", "yellow", "sour"], clue: "It is small and yellow. It tastes sour." },
  watermelon: { name: "watermelon", emoji: "🍉", words: ["big", "heavy", "green"], clue: "It is big and heavy. It is green outside and red inside." },
  milk: { name: "milk", emoji: "🥛", words: ["white", "cold"], clue: "It is white and cold. You drink it from a glass." },
  egg: { name: "egg", emoji: "🥚", words: ["white", "oval"], clue: "It is white and oval. A hen lays it." },
  carrot: { name: "carrot", emoji: "🥕", words: ["long", "orange"], clue: "It is long and orange. Rabbits love to eat it." },
  bread: { name: "bread", emoji: "🍞", words: ["soft", "brown"], clue: "It is soft and brown. You eat it for breakfast." },
  candy: { name: "candy", emoji: "🍬", words: ["small", "sweet"], clue: "It is small and sweet. It comes in a wrapper." },
  grapes: { name: "grapes", emoji: "🍇", words: ["small", "purple"], clue: "They are small and purple. They grow in a bunch." },
};

// Each shelf bin has its own color so the items are easy to tell apart.
export const BIN_COLORS = ["#4dabf7", "#ff922b", "#be4bdb", "#20c997"];

export const INSTRUCTION = "Listen to the clue, then tap the thing it tells about!";

export const LOADING = "Opening the store…";

export function clueSpeech(target: string): string {
  return `Listen. ${ITEMS[target].clue} What is it?`;
}

const CHEERS = ["Yes!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(target: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} It is the ${ITEMS[target].name}.`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} ${ITEMS[target].clue} It is the ${ITEMS[target].name}.`;
}

export const DONE = "Super shopper! You found everything on the list!";

export const DONE_MISSED = "Good shopping! Keep listening to the words that tell about things.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} things.`;
}
