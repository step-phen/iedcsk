// Pictures and spoken lines for Story Picture Match; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// The story's sentences and each round's pictures come from activity_questions; emoji stand in until the picture art is added.
export const PICTURES: Record<string, { name: string; emoji: string }> = {
  cap: { name: "Cap", emoji: "🧢" },
  hat: { name: "Hat", emoji: "🎩" },
  sock: { name: "Sock", emoji: "🧦" },
  bike: { name: "Bike", emoji: "🚲" },
  bus: { name: "Bus", emoji: "🚌" },
  boat: { name: "Boat", emoji: "⛵" },
  dog: { name: "Dog", emoji: "🐶" },
  hen: { name: "Hen", emoji: "🐔" },
  pig: { name: "Pig", emoji: "🐷" },
  hotdog: { name: "Hot dog", emoji: "🌭" },
  apple: { name: "Apple", emoji: "🍎" },
  cake: { name: "Cake", emoji: "🎂" },
  tub: { name: "Tub", emoji: "🛁" },
  tent: { name: "Tent", emoji: "⛺" },
  bed: { name: "Bed", emoji: "🛏️" },
};

export const STORY_TITLE = "Dan's Fun Day";

export const INSTRUCTION = "Read the story, then tap the picture!";

export const READ_PART = "Read this part of the story. Tap the speaker if you want to hear it.";

export const QUESTION = "Which picture shows what happens?";

const CHEERS = ["Pow! You got it!", "Great reading!", "That's right!", "Super story reader!", "Well done!"];

export function correctSpeech(sentence: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${sentence}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(sentence: string): string {
  return `${REVEAL_TEXT} ${sentence}`;
}

export const DONE = "Wow! You matched every part of the story!";

export const DONE_MISSED = "Good reading! Keep looking for what happens in the story.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} story pictures.`;
}
