// Train car colors and spoken lines for Listen and Find: Ss, Tt; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Ss", "Tt"];

// One train car color per spot, so the right car is never told apart by color.
export const CAR_COLORS = ["#ff8787", "#69db7c", "#ffd43b", "#74c0fc"];

export const INSTRUCTION = "Listen, then tap the train car with that letter!";

export const LOADING = "The train is coming…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and S from T. */
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

export const DONE = "Choo choo! The train is ready to go!";

export const DONE_MISSED = "Good try! Keep looking for S and T.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
