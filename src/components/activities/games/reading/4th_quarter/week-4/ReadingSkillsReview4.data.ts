// Pictures and spoken lines for Reading Skills Review 4; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export type Kind = "word" | "phrase" | "rhyme" | "book" | "story";

// Answer pictures; a phrase id is "<who>-<where>" and shows both pictures. Emoji stand in until drawn art is added.
export const PICTURES: Record<string, { name: string; emoji: string }> = {
  cap: { name: "cap", emoji: "🧢" },
  cup: { name: "cup", emoji: "🥤" },
  cat: { name: "cat", emoji: "🐱" },
  jet: { name: "jet", emoji: "🛩️" },
  net: { name: "net", emoji: "🥅" },
  web: { name: "web", emoji: "🕸️" },
  hat: { name: "hat", emoji: "🎩" },
  dog: { name: "dog", emoji: "🐶" },
  sun: { name: "sun", emoji: "☀️" },
  pen: { name: "pen", emoji: "🖊️" },
  run: { name: "run", emoji: "🏃" },
  bus: { name: "bus", emoji: "🚌" },
  van: { name: "van", emoji: "🚐" },
  ken: { name: "Ken", emoji: "👦" },
  pam: { name: "Pam", emoji: "👧" },
  dad: { name: "Dad", emoji: "👨" },
  "cat-box": { name: "a cat in a box", emoji: "🐱📦" },
  "dog-box": { name: "a dog in a box", emoji: "🐶📦" },
  "dog-bed": { name: "a dog on a bed", emoji: "🐶🛏️" },
  "bug-log": { name: "a bug on a log", emoji: "🐛🪵" },
  "hen-log": { name: "a hen on a log", emoji: "🐔🪵" },
  "bug-bed": { name: "a bug on a bed", emoji: "🐛🛏️" },
};

export const BOOK_PARTS: Record<string, string> = {
  cover: "the front cover",
  title: "the title",
  pages: "the pages",
};

export const INSTRUCTION = "Listen, then hit the buzzer with the answer!";

export function promptSpeech(kind: Kind, text: string, question: string | null): string {
  switch (kind) {
    case "word":
      return "Read the word. Which picture shows it?";
    case "phrase":
      return "Read the words. Which picture shows them?";
    case "rhyme":
      return `Which word rhymes with ${text}?`;
    case "book":
      return `Where is ${BOOK_PARTS[text]} of the book?`;
    case "story":
      return `Read the story. ${question}`;
  }
}

export function answerLine(kind: Kind, text: string, answer: string): string {
  switch (kind) {
    case "word":
    case "phrase":
      return `It says ${text}.`;
    case "rhyme":
      return `${text} and ${PICTURES[answer].name} rhyme.`;
    case "book":
      return `This is ${BOOK_PARTS[answer]}.`;
    case "story":
      return `The answer is ${PICTURES[answer].name}.`;
  }
}

const CHEERS = ["Ding ding ding! Correct!", "You're a reading star!", "That's right!", "Big points!", "Super reader!"];

export function correctSpeech(line: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${line}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(line: string): string {
  return `${REVEAL_TEXT} ${line}`;
}

export const DONE = "What a show! You answered every reading question!";

export const DONE_MISSED = "Great show! Keep practicing your reading skills.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You got ${score} out of ${total} right.`;
}
