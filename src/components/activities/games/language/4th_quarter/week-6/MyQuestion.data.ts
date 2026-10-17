// Pictures, question sentences and spoken lines for My Question; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Every question the cue cards can hold; "word" is the question word shown on the microphone.
export const QUESTIONS: Record<string, { word: "Who" | "What" | "Where"; text: string }> = {
  "what-kick": { word: "What", text: "What is the boy kicking?" },
  "where-cat": { word: "Where", text: "Where is the cat?" },
  "who-bake": { word: "Who", text: "Who is baking a cake?" },
  "where-bird": { word: "Where", text: "Where is the bird?" },
  "what-kite": { word: "What", text: "What is the girl flying?" },
  "who-bus": { word: "Who", text: "Who is driving the bus?" },
  "where-fish": { word: "Where", text: "Where is the fish swimming?" },
  "what-cow": { word: "What", text: "What is the cow drinking?" },
  "who-sleep": { word: "Who", text: "Who is sleeping in the bed?" },
  "where-moon": { word: "Where", text: "Where is the moon?" },
  "what-baby": { word: "What", text: "What is the baby eating?" },
};

// One thing drawn in a picture: x and y are its center as a percent of the picture, size is a share of the picture's height.
export interface Part {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

// "question" is the one question this picture can answer, and "answer" is what the picture says back.
export const SCENES: Record<string, { caption: string; question: string; answer: string; backdrop: string; parts: Part[] }> = {
  kick: {
    caption: "A boy kicks a ball in the park.",
    question: "what-kick",
    answer: "He is kicking a ball.",
    backdrop: "linear-gradient(180deg, #d0ebff 0 62%, #8ce99a 62%)",
    parts: [
      { emoji: "🌳", x: 80, y: 42, size: 0.36 },
      { emoji: "👦", x: 32, y: 58, size: 0.44 },
      { emoji: "⚽", x: 62, y: 80, size: 0.18 },
    ],
  },
  "cat-box": {
    caption: "A cat sits inside a box.",
    question: "where-cat",
    answer: "The cat is in the box.",
    backdrop: "linear-gradient(180deg, #fff4e6 0 66%, #e9c46a 66%)",
    parts: [
      { emoji: "🐱", x: 50, y: 44, size: 0.28 },
      { emoji: "📦", x: 50, y: 70, size: 0.42 },
    ],
  },
  bake: {
    caption: "A cook bakes a birthday cake.",
    question: "who-bake",
    answer: "The cook is baking a cake.",
    backdrop: "linear-gradient(180deg, #fff0f6 0 64%, #e599f7 64%)",
    parts: [
      { emoji: "👩‍🍳", x: 34, y: 56, size: 0.46 },
      { emoji: "🎂", x: 72, y: 72, size: 0.26 },
    ],
  },
  "bird-nest": {
    caption: "A little bird sits up in a tree.",
    question: "where-bird",
    answer: "The bird is in the tree.",
    backdrop: "linear-gradient(180deg, #e3fafc 0 72%, #69db7c 72%)",
    parts: [
      { emoji: "🌳", x: 46, y: 54, size: 0.74 },
      { emoji: "🐦", x: 56, y: 34, size: 0.18 },
    ],
  },
  kite: {
    caption: "A girl flies a kite on a windy day.",
    question: "what-kite",
    answer: "She is flying a kite.",
    backdrop: "linear-gradient(180deg, #a5d8ff 0 70%, #b2f2bb 70%)",
    parts: [
      { emoji: "☁️", x: 34, y: 18, size: 0.16 },
      { emoji: "🪁", x: 72, y: 26, size: 0.28 },
      { emoji: "👧", x: 30, y: 66, size: 0.4 },
    ],
  },
};

export const INSTRUCTION = "Look, listen, then tap the question that fits!";

export const LOADING = "Setting up the camera…";

export function promptSpeech(scene: string): string {
  return `Look at the picture. ${SCENES[scene].caption} Which question fits the picture?`;
}

export function choiceSpeech(index: number, question: string): string {
  return `Question ${index + 1}. ${QUESTIONS[question].text}`;
}

const CHEERS = ["Good question!", "You got it!", "Great asking!", "That's right!", "Super reporter!"];

export function correctSpeech(scene: string, roundIndex: number): string {
  const { question, answer } = SCENES[scene];
  return `${CHEERS[roundIndex % CHEERS.length]} ${QUESTIONS[question].text} ${answer}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(scene: string): string {
  const { question, answer } = SCENES[scene];
  return `${REVEAL} ${QUESTIONS[question].text} ${answer}`;
}

export const DONE = "What a super reporter! You chose every question right!";

export const DONE_MISSED = "Good try! Ask about what you can see in the picture.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You chose ${score} out of ${total} right.`;
}
