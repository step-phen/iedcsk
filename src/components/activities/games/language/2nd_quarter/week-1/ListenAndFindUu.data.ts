// Umbrella colors and spoken lines for Listen and Find: Uu; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = { upper: "U", lower: "u" };

// One canopy color per spot, so the right umbrella is never told apart by color.
export const CANOPY_COLORS = ["#ff7a59", "#ffc83d", "#3fbf86", "#9b7bf0"];

export const INSTRUCTION = "Listen, then tap the umbrella with that letter!";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to know which umbrella is big U and which is small u. */
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

export const DONE = "Hooray! You found every U in the rain!";

export const DONE_MISSED = "Good try! Keep looking for big U and small u.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
