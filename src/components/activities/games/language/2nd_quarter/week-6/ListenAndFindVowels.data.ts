// Planet colors and spoken lines for Listen and Find: Aa, Ee, Ii, Oo, Uu; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Aa", "Ee", "Ii", "Oo", "Uu"];

// [planet, ring] per spot, so the right planet is never told apart by color.
export const PLANET_COLORS: [string, string][] = [
  ["#ff922b", "#ffd8a8"],
  ["#4dabf7", "#d0ebff"],
  ["#da77f2", "#f3d9fa"],
  ["#69db7c", "#d3f9d8"],
];

export const INSTRUCTION = "Listen, then tap the planet with that letter!";

export const LOADING = "Blasting off…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and one vowel from another. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

export function correctSpeech(target: string): string {
  return `Out of this world! That is ${caseName(target)} ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is ${caseName(target)} ${target}.`;
}

export const DONE = "Blast off! You know all five vowels!";

export const DONE_MISSED = "Good try, space explorer! Keep practicing A, E, I, O, U.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
