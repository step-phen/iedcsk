// Kite colors and spoken lines for Listen and Find: Jj, Kk; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Jj", "Kk"];

// [main color, cross panel color] per spot, so the right kite is never told apart by color.
export const KITE_COLORS: [string, string][] = [
  ["#ff6b6b", "#ffc9c9"],
  ["#845ef7", "#d0bfff"],
  ["#20c997", "#b2f2bb"],
  ["#fd7e14", "#ffd8a8"],
];

export const INSTRUCTION = "Listen, then tap the kite with that letter!";

export const LOADING = "Waiting for the wind…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and J from K. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

export function correctSpeech(target: string): string {
  return `Yes! That is ${caseName(target)} ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is ${caseName(target)} ${target}.`;
}

export const DONE = "Whoosh! Every kite flew high in the sky!";

export const DONE_MISSED = "Good try! Keep looking for J and K.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
