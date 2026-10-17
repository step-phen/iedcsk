// Spoken lines for Word Hunt; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Listen, then tap the ice block with the word!";

export function questionSpeech(target: string): string {
  return `Find the word ${target}.`;
}

const CHEERS = ["Splash! You found it!", "Cool reading!", "That's right!", "Super word hunter!", "Well done!"];

export function correctSpeech(target: string, roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} This word is ${target}.`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL_TEXT} This word is ${target}.`;
}

export const DONE = "Hooray! Penguin crossed the whole lake with you!";

export const DONE_MISSED = "Good hunting! Keep reading each word carefully.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} words.`;
}
