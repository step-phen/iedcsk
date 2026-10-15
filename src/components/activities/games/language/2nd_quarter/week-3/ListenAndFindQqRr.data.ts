// Robot colors and spoken lines for Listen and Find: Qq, Rr; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const TODAY = ["Qq", "Rr"];

// One robot color per spot, so the right robot is never told apart by color.
export const ROBOT_COLORS = ["#74c0fc", "#ffa94d", "#b197fc", "#63e6be"];

export const INSTRUCTION = "Listen, then tap the robot with that letter!";

export const LOADING = "Switching on the robots…";

const caseName = (letter: string) => (letter === letter.toUpperCase() ? "big" : "small");

/** Only heard, never shown, so the child has to tell big from small and Q from R. */
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

export const DONE = "Beep boop! Every robot is dancing!";

export const DONE_MISSED = "Good try! Keep looking for Q and R.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You found ${score} out of ${total} letters.`;
}
