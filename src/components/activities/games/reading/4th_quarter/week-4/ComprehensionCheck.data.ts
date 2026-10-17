// Pictures and spoken lines for Comprehension Check; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Answer pictures with the name read under each; emoji stand in until drawn art is added.
export const PICTURES: Record<string, { name: string; emoji: string }> = {
  tom: { name: "Tom", emoji: "👦" },
  pam: { name: "Pam", emoji: "👧" },
  dad: { name: "Dad", emoji: "👨" },
  bus: { name: "bus", emoji: "🚌" },
  van: { name: "van", emoji: "🚐" },
  bike: { name: "bike", emoji: "🚲" },
  farm: { name: "farm", emoji: "🚜" },
  school: { name: "school", emoji: "🏫" },
  beach: { name: "beach", emoji: "🏖️" },
  pig: { name: "pig", emoji: "🐷" },
  hen: { name: "hen", emoji: "🐔" },
  cow: { name: "cow", emoji: "🐮" },
  tub: { name: "tub", emoji: "🛁" },
  box: { name: "box", emoji: "📦" },
  bed: { name: "bed", emoji: "🛏️" },
};

export const INSTRUCTION = "Read the story, then tap the boat with the answer!";

export const STORY_HELP = "Read the story. You can tap the speaker to hear it.";

const CHEERS = ["Ahoy! That's right!", "Great reading!", "Full sail! You got it!", "Smart reader!", "Well done!"];

export function correctSpeech(name: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} The answer is ${name}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(name: string): string {
  return `${REVEAL_TEXT} The answer is ${name}.`;
}

export const DONE = "Hooray! You answered every question about the story!";

export const DONE_MISSED = "Good job! Read the story again to find the answers.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You answered ${score} out of ${total} questions.`;
}
