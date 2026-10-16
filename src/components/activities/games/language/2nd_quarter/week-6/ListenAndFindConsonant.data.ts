// Balloon colors and spoken lines for the Language "Listen and Find the Letter" (Hot-Air Balloons); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// [main, stripe] per spot, so the right balloon is never told apart by color.
export const BALLOON_COLORS: [string, string][] = [
  ["#ff6b6b", "#ffe066"],
  ["#5c7cfa", "#ffffff"],
  ["#ffa94d", "#e599f7"],
  ["#20c997", "#fff3bf"],
];

export const INSTRUCTION = "Listen, then tap the balloon with that letter!";

export const LOADING = "Filling the balloons…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to pick the named consonant out of look-alikes. */
export function promptSpeech(target: string): string {
  return `Find ${caseName(target)} ${target}.`;
}

export function correctSpeech(target: string): string {
  return `Up, up and away! That is ${caseName(target)} ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} This is ${caseName(target)} ${target}.`;
}

export const DONE = "Hooray! Every balloon is flying high!";

export const DONE_MISSED = "Good try! Let's keep listening for our consonants.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
