// Lily pad shades and spoken lines for Listen and Find: Xx, Yy; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Xx", "Yy"];

// One pad shade per spot, so the right pad is never told apart by color.
export const PAD_SHADES = ["#69db7c", "#8ce99a", "#51cf66", "#94d82d"];

export const INSTRUCTION = "Listen, then tap the lily pad with that letter!";

export const LOADING = "The frog is waking up…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and X from Y. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

export function correctSpeech(target: string): string {
  return `Ribbit! That is ${caseName(target)} ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is ${caseName(target)} ${target}.`;
}

export const DONE = "Hop hop hooray! The frog crossed the pond!";

export const DONE_MISSED = "Good try! Keep looking for X and Y.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
