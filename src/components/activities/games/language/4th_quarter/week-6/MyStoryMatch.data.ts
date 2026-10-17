// The story, its event pictures and spoken lines for My Story Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// One thing drawn in a painting: x and y are its center as a percent of the painting, size is a share of the painting's width.
export interface Part {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

// Each event is one sentence of the story and the painting that shows it; which event a round asks for comes from activity_questions.
export const EVENTS: Record<string, { sentence: string; backdrop: string; parts: Part[] }> = {
  plant: {
    sentence: "Lily plants a little seed.",
    backdrop: "linear-gradient(180deg, #e7f5ff 0 58%, #a0522d 58%)",
    parts: [
      { emoji: "👧", x: 34, y: 46, size: 0.46 },
      { emoji: "🌰", x: 70, y: 76, size: 0.18 },
    ],
  },
  water: {
    sentence: "She waters it every day.",
    backdrop: "linear-gradient(180deg, #d0ebff 0 62%, #8b5a2b 62%)",
    parts: [
      { emoji: "👧", x: 30, y: 48, size: 0.44 },
      { emoji: "💧", x: 62, y: 44, size: 0.14 },
      { emoji: "💧", x: 72, y: 56, size: 0.12 },
      { emoji: "🌱", x: 70, y: 74, size: 0.2 },
    ],
  },
  sun: {
    sentence: "The warm sun shines on it.",
    backdrop: "linear-gradient(180deg, #fff3bf 0 64%, #8b5a2b 64%)",
    parts: [
      { emoji: "☀️", x: 68, y: 26, size: 0.36 },
      { emoji: "🌱", x: 38, y: 64, size: 0.28 },
    ],
  },
  flower: {
    sentence: "A big yellow flower grows!",
    backdrop: "linear-gradient(180deg, #e3fafc 0 70%, #69db7c 70%)",
    parts: [{ emoji: "🌻", x: 50, y: 50, size: 0.66 }],
  },
  give: {
    sentence: "Lily gives the flower to her mom.",
    backdrop: "linear-gradient(180deg, #fff0f6 0 70%, #fcc2d7 70%)",
    parts: [
      { emoji: "👧", x: 26, y: 56, size: 0.4 },
      { emoji: "🌻", x: 50, y: 52, size: 0.2 },
      { emoji: "👩", x: 76, y: 52, size: 0.44 },
    ],
  },
};

export const STORY_TITLE = "Lily's Little Seed";

// The story is read in this order before the first sentence is matched.
export const STORY = ["plant", "water", "sun", "flower", "give"];

export const INSTRUCTION = "Listen, then tap the painting that shows it!";

export const LOADING = "Opening the gallery…";

export function storySpeech(): string[] {
  return [`Here is the story. ${STORY_TITLE}.`, ...STORY.map((e) => EVENTS[e].sentence)];
}

export function promptSpeech(event: string): string {
  return `Listen. ${EVENTS[event].sentence} Which painting shows it?`;
}

const CHEERS = ["You found it!", "That's right!", "Great matching!", "Yes!", "Wonderful!"];

export function correctSpeech(event: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${EVENTS[event].sentence}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(event: string): string {
  return `${REVEAL} ${EVENTS[event].sentence}`;
}

export const DONE = "Bravo! You matched every sentence to the story!";

export const DONE_MISSED = "Good try! Listen closely and picture what happens.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} right.`;
}
