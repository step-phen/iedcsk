// Scenes, sentences and spoken lines for Picture Questions; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Every sentence a trail sign can hold.
export const SENTENCES: Record<string, string> = {
  "cow-grass": "The cow is eating grass.",
  "cow-bed": "The cow is sleeping in a bed.",
  "cow-fly": "The cow is flying in the sky.",
  "duck-pond": "The duck is in the pond.",
  "duck-bed": "The duck is in the bed.",
  "duck-roof": "The duck is on the roof.",
  "girl-umbrella": "The girl has an umbrella.",
  "girl-bike": "The girl is riding a bike.",
  "girl-icecream": "The girl is eating ice cream.",
  "grandpa-reads": "Grandpa is reading a book.",
  "mom-reads": "Mom is reading a book.",
  "baby-reads": "The baby is reading a book.",
  "boy-melon": "He is eating watermelon.",
  "boy-bread": "He is eating bread.",
  "boy-egg": "He is eating an egg.",
};

// One thing drawn in a scene: x and y are its center as a percent of the scene, size is a share of the scene's height.
export interface Part {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

// "question" is null when the learner picks the sentence that describes the scene; "answer" is the sentence that fits.
export const SCENES: Record<string, { caption: string; question: string | null; answer: string; backdrop: string; parts: Part[] }> = {
  cow: {
    caption: "A cow on a farm with tall grass.",
    question: null,
    answer: "cow-grass",
    backdrop: "linear-gradient(180deg, #c5f6fa 0 55%, #8ce99a 55%)",
    parts: [
      { emoji: "🌾", x: 30, y: 72, size: 0.2 },
      { emoji: "🐄", x: 52, y: 56, size: 0.42 },
      { emoji: "🌾", x: 72, y: 76, size: 0.18 },
    ],
  },
  duck: {
    caption: "A duck floats on the water.",
    question: "Where is the duck?",
    answer: "duck-pond",
    backdrop: "linear-gradient(180deg, #d0ebff 0 46%, #8ce99a 46% 54%, #4dabf7 54%)",
    parts: [
      { emoji: "🌿", x: 30, y: 46, size: 0.18 },
      { emoji: "🦆", x: 54, y: 62, size: 0.32 },
    ],
  },
  rain: {
    caption: "A girl walks in the rain.",
    question: null,
    answer: "girl-umbrella",
    backdrop: "linear-gradient(180deg, #adb5bd 0 70%, #868e96 70%)",
    parts: [
      { emoji: "🌧️", x: 68, y: 22, size: 0.22 },
      { emoji: "☂️", x: 44, y: 34, size: 0.3 },
      { emoji: "👧", x: 44, y: 66, size: 0.38 },
    ],
  },
  grandpa: {
    caption: "Grandpa sits on the sofa with a book.",
    question: "Who is reading a book?",
    answer: "grandpa-reads",
    backdrop: "linear-gradient(180deg, #fff4e6 0 66%, #e8b37a 66%)",
    parts: [
      { emoji: "🛋️", x: 50, y: 70, size: 0.42 },
      { emoji: "👴", x: 44, y: 46, size: 0.34 },
      { emoji: "📖", x: 62, y: 56, size: 0.16 },
    ],
  },
  melon: {
    caption: "A boy has a snack on a sunny day.",
    question: "What is the boy eating?",
    answer: "boy-melon",
    backdrop: "linear-gradient(180deg, #fff3bf 0 64%, #ffd8a8 64%)",
    parts: [
      { emoji: "☀️", x: 70, y: 22, size: 0.2 },
      { emoji: "👦", x: 38, y: 58, size: 0.42 },
      { emoji: "🍉", x: 64, y: 70, size: 0.22 },
    ],
  },
};

export const INSTRUCTION = "Look, listen, then tap the sign that fits!";

export const LOADING = "Getting the binoculars…";

export function promptSpeech(scene: string): string {
  const { caption, question } = SCENES[scene];
  return question ? `${caption} ${question}` : `${caption} Which sentence tells about the picture?`;
}

export function choiceSpeech(index: number, sentence: string): string {
  return `Sign ${index + 1}. ${SENTENCES[sentence]}`;
}

const CHEERS = ["Good looking!", "You got it!", "Sharp eyes!", "That's right!", "Super explorer!"];

export function correctSpeech(scene: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${SENTENCES[SCENES[scene].answer]}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(scene: string): string {
  return `${REVEAL} ${SENTENCES[SCENES[scene].answer]}`;
}

export const DONE = "What a great explorer! Every sign fit the picture!";

export const DONE_MISSED = "Good try! Look closely at the picture before you choose.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You chose ${score} out of ${total} right.`;
}
