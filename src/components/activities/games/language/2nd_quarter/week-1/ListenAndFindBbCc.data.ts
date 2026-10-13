// Butterfly colors and spoken lines for Listen and Find: Bb, Cc; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Bb", "Cc"];

// [upper wing, lower wing] per spot, so the right butterfly is never told apart by color.
export const WING_COLORS: [string, string][] = [
  ["#ff8fb1", "#ffc2d4"],
  ["#7cc7ff", "#bfe4ff"],
  ["#ffb648", "#ffe0a8"],
  ["#b28dff", "#dccbff"],
];

export const INSTRUCTION = "Listen, then tap the butterfly with that letter!";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and B from C. */
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

export const DONE = "Wonderful! All the butterflies flew home!";

export const DONE_MISSED = "Good try! Keep looking for B and C.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
