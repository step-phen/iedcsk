// Paint pot colors and spoken lines for Listen and Find: Nn, Pp; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Nn", "Pp"];

// One paint color per spot, so the right pot is never told apart by color.
export const PAINT_COLORS = ["#ff6b6b", "#4dabf7", "#ffd43b", "#9775fa"];

export const INSTRUCTION = "Listen, then tap the paint pot with that letter!";

export const LOADING = "Mixing the paints…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and N from P. */
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

export const DONE = "Splash! You found every letter with paint!";

export const DONE_MISSED = "Good try! Keep looking for N and P.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
