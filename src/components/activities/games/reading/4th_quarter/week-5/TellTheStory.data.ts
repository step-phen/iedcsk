// Pictures and spoken lines for Tell the Story; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Event pictures for the Tom story; emoji stand in until drawn art is added.
export const EVENTS: Record<string, { name: string; emoji: string }> = {
  bus: { name: "Tom's red bus", emoji: "🚌" },
  geton: { name: "Tom and Dad", emoji: "👨‍👦" },
  farm: { name: "the farm", emoji: "🚜" },
  pig: { name: "the pig", emoji: "🐷" },
  tub: { name: "the tub", emoji: "🛁" },
};

export const INSTRUCTION = "Retell the story on the radio!";

export const STORY_HELP = "Read the story. You can tap the speaker to hear it. Then tell it on the radio!";

export function stepQuestion(step: number, steps: number): string {
  if (step === 1) return "What happened first?";
  if (step === steps) return "What happened last?";
  return "What happened next?";
}

const CHEERS = ["You're on the air! That's right!", "Great storytelling!", "Yes!", "Super storyteller!", "Well done!"];

export function correctSpeech(sentence: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} ${sentence}`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(sentence: string): string {
  return `${REVEAL_TEXT} ${sentence}`;
}

export const DONE = "What a great show! You told the whole story!";

export const DONE_MISSED = "Good job! Read the story again and tell it in order.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You told ${score} out of ${total} parts of the story.`;
}
