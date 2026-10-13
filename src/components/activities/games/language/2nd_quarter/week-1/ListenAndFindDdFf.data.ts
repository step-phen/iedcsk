// Firefly spots and spoken lines for Listen and Find: Dd, Ff; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Dd", "Ff"];

// Where each firefly hovers in the night field, in percent of the field; zig-zagged so none overlap on a phone.
export const SPOTS = [
  { x: 17, y: 26 },
  { x: 39, y: 60 },
  { x: 61, y: 24 },
  { x: 83, y: 58 },
];

// Where a caught firefly flies: inside the jar standing at the bottom middle of the field.
export const JAR = { x: 50, y: 88 };

export const INSTRUCTION = "Listen, then catch the firefly with that letter!";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and D from F. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

export function correctSpeech(target: string): string {
  return `You caught it! That is ${caseName(target)} ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is ${caseName(target)} ${target}.`;
}

export const DONE = "Amazing! Your jar is full of fireflies!";

export const DONE_MISSED = "Good try! Keep looking for D and F.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You caught ${score} out of ${total} fireflies.`;
}
