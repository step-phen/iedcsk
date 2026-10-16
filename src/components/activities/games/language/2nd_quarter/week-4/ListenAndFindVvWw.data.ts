// Bubble tints and spoken lines for Listen and Find: Vv, Ww; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Vv", "Ww"];

// One bubble tint per spot, so the right bubble is never told apart by color.
export const BUBBLE_TINTS = ["#a5f3fc", "#c4b5fd", "#99f6e4", "#bae6fd"];

export const INSTRUCTION = "Listen, then tap the bubble with that letter!";

export const LOADING = "Blowing the bubbles…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and V from W. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

export function correctSpeech(target: string): string {
  return `Pop! That is ${caseName(target)} ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is ${caseName(target)} ${target}.`;
}

export const DONE = "Splash! You found every bubble!";

export const DONE_MISSED = "Good try! Keep looking for V and W.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
