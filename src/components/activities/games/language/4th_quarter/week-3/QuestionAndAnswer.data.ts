// Photo scenes, their questions, answer pictures and spoken lines for Question and Answer; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const PICTURES: Record<string, { name: string; emoji: string }> = {
  cat: { name: "the cat", emoji: "🐱" },
  dog: { name: "the dog", emoji: "🐶" },
  bird: { name: "the bird", emoji: "🐦" },
  balloon: { name: "a balloon", emoji: "🎈" },
  umbrella: { name: "an umbrella", emoji: "☂️" },
  book: { name: "a book", emoji: "📖" },
  tree: { name: "in the tree", emoji: "🌳" },
  car: { name: "in the car", emoji: "🚗" },
  boat: { name: "in the boat", emoji: "⛵" },
  monkey: { name: "the monkey", emoji: "🐒" },
  rabbit: { name: "the rabbit", emoji: "🐰" },
  pig: { name: "the pig", emoji: "🐷" },
  sea: { name: "in the sea", emoji: "🌊" },
  bed: { name: "on the bed", emoji: "🛏️" },
  sky: { name: "in the sky", emoji: "☁️" },
};

// One thing drawn in a photo: x and y are its center as a percent of the photo, size is a share of the photo's height.
export interface Part {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

// Each photo with the question asked about it and its answer; which scene a round shows comes from activity_questions.
export const SCENES: Record<string, { kind: "who" | "what" | "where"; question: string; answer: string; line: string; backdrop: string; parts: Part[] }> = {
  "cat-bed": {
    kind: "who",
    question: "Who is sleeping on the bed?",
    answer: "cat",
    line: "The cat is sleeping on the bed.",
    backdrop: "linear-gradient(180deg, #e5dbff 0 62%, #b197fc 62%)",
    parts: [
      { emoji: "🛏️", x: 50, y: 66, size: 0.6 },
      { emoji: "🐱", x: 46, y: 44, size: 0.28 },
      { emoji: "💤", x: 66, y: 22, size: 0.18 },
    ],
  },
  "girl-balloon": {
    kind: "what",
    question: "What is the girl holding?",
    answer: "balloon",
    line: "The girl is holding a balloon.",
    backdrop: "linear-gradient(180deg, #d0ebff 0 70%, #8ce99a 70%)",
    parts: [
      { emoji: "👧", x: 42, y: 66, size: 0.42 },
      { emoji: "🎈", x: 64, y: 28, size: 0.32 },
    ],
  },
  "bird-tree": {
    kind: "where",
    question: "Where is the bird?",
    answer: "tree",
    line: "The bird is in the tree.",
    backdrop: "linear-gradient(180deg, #c5f6fa 0 78%, #94d82d 78%)",
    parts: [
      { emoji: "🌳", x: 50, y: 54, size: 0.82 },
      { emoji: "🐦", x: 56, y: 36, size: 0.18 },
    ],
  },
  "monkey-banana": {
    kind: "who",
    question: "Who is eating a banana?",
    answer: "monkey",
    line: "The monkey is eating a banana.",
    backdrop: "linear-gradient(180deg, #fff3bf 0 72%, #d8a26a 72%)",
    parts: [
      { emoji: "🐒", x: 44, y: 58, size: 0.5 },
      { emoji: "🍌", x: 66, y: 50, size: 0.24 },
    ],
  },
  "fish-sea": {
    kind: "where",
    question: "Where is the fish swimming?",
    answer: "sea",
    line: "The fish is swimming in the sea.",
    backdrop: "linear-gradient(180deg, #a5d8ff 0 30%, #339af0 30% 100%)",
    parts: [
      { emoji: "🐟", x: 40, y: 58, size: 0.28 },
      { emoji: "🐠", x: 68, y: 76, size: 0.18 },
      { emoji: "🌊", x: 50, y: 26, size: 0.24 },
    ],
  },
};

export const INSTRUCTION = "Look at the photo and answer the question!";

export const LOADING = "Focusing the camera…";

const CHEERS = ["Yes!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(scene: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${SCENES[scene].line}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(scene: string): string {
  return `${REVEAL} ${SCENES[scene].line}`;
}

export const DONE = "Click! Super photographer! You answered every question!";

export const DONE_MISSED = "Good looking! Keep listening for who, what and where.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You answered ${score} out of ${total} questions.`;
}
