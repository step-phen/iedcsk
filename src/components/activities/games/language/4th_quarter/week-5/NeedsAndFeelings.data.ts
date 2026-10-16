// Scenes, need and feeling sentences and spoken lines for Needs and Feelings; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// What a child could say: the face on the bubble and the sentence read aloud.
export const EXPRESSIONS: Record<string, { face: string; sentence: string }> = {
  hungry: { face: "😋", sentence: "I am hungry. I need some food." },
  sleepy: { face: "🥱", sentence: "I am sleepy. I want to rest." },
  happy: { face: "😄", sentence: "I am happy! Thank you!" },
  hurt: { face: "🤕", sentence: "I am hurt. Please help me." },
  scared: { face: "😨", sentence: "I am scared. Please stay with me." },
  sad: { face: "😢", sentence: "I am sad." },
  cold: { face: "🥶", sentence: "I am cold. I need a jacket." },
  thirsty: { face: "🥵", sentence: "I am thirsty. I need some water." },
};

// One thing drawn in a scene: x and y are its center as a percent of the scene, size is a share of the scene's height.
export interface Part {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

// Each scene's id is the need or feeling that fits it; which scene a round shows comes from activity_questions.
export const SCENES: Record<string, { caption: string; backdrop: string; parts: Part[] }> = {
  hungry: {
    caption: "Ben has not eaten all day. His plate is empty.",
    backdrop: "linear-gradient(180deg, #fff4e6 0 64%, #ffc078 64%)",
    parts: [
      { emoji: "👦", x: 34, y: 56, size: 0.44 },
      { emoji: "🍽️", x: 68, y: 74, size: 0.26 },
      { emoji: "💭", x: 62, y: 24, size: 0.24 },
    ],
  },
  hurt: {
    caption: "Ana fell off her bike and scraped her knee.",
    backdrop: "linear-gradient(180deg, #e7f5ff 0 66%, #ced4da 66%)",
    parts: [
      { emoji: "👧", x: 36, y: 60, size: 0.42 },
      { emoji: "🚲", x: 70, y: 72, size: 0.3 },
      { emoji: "🩹", x: 44, y: 84, size: 0.14 },
    ],
  },
  happy: {
    caption: "It is Mia's birthday. She got a big present.",
    backdrop: "linear-gradient(180deg, #fff0f6 0 70%, #fcc2d7 70%)",
    parts: [
      { emoji: "👧", x: 34, y: 58, size: 0.42 },
      { emoji: "🎁", x: 68, y: 70, size: 0.28 },
      { emoji: "🎉", x: 70, y: 26, size: 0.22 },
    ],
  },
  thirsty: {
    caption: "Leo played outside in the hot sun for a long time.",
    backdrop: "linear-gradient(180deg, #fff9db 0 66%, #ffe066 66%)",
    parts: [
      { emoji: "☀️", x: 76, y: 20, size: 0.26 },
      { emoji: "👦", x: 38, y: 60, size: 0.44 },
      { emoji: "⚽", x: 70, y: 80, size: 0.16 },
    ],
  },
  scared: {
    caption: "There is a loud storm outside. Boom goes the thunder!",
    backdrop: "linear-gradient(180deg, #495057 0 66%, #343a40 66%)",
    parts: [
      { emoji: "⛈️", x: 68, y: 24, size: 0.3 },
      { emoji: "🧒", x: 36, y: 62, size: 0.42 },
      { emoji: "⚡", x: 82, y: 50, size: 0.16 },
    ],
  },
};

// Each speech bubble has its own tint so the three are easy to tell apart.
export const BUBBLE_TINTS = ["#e7f5ff", "#fff0f6", "#ebfbee"];

export const INSTRUCTION = "Look, listen, then tap what the child would say!";

export const LOADING = "Opening the window…";

export function promptSpeech(scene: string): string {
  return `${SCENES[scene].caption} What would the child say?`;
}

export function choiceSpeech(index: number, expression: string): string {
  return `Number ${index + 1}. ${EXPRESSIONS[expression].sentence}`;
}

const CHEERS = ["Yes!", "You got it!", "Great thinking!", "That's right!", "Wonderful!"];

export function correctSpeech(scene: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${EXPRESSIONS[scene].sentence}`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(scene: string): string {
  return `${REVEAL} ${EXPRESSIONS[scene].sentence}`;
}

export const DONE = "You know how everyone feels! You chose every one right!";

export const DONE_MISSED = "Good try! Look at the picture and think how the child feels.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You chose ${score} out of ${total} right.`;
}
