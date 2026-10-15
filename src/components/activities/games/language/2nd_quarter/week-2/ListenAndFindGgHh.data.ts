// Gumball colors and spoken lines for Listen and Find: Gg, Hh; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Gg", "Hh"];

// One gumball color per spot, so the right gumball is never told apart by color.
export const GUMBALL_COLORS = ["#ff5d8f", "#4cc9f0", "#ffd23f", "#7bd389"];

export const INSTRUCTION = "Listen, then tap the gumball with that letter!";

export const LOADING = "Filling the gumball machine…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and G from H. */
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

export const DONE = "Yum! You got every gumball!";

export const DONE_MISSED = "Good try! Keep looking for G and H.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
