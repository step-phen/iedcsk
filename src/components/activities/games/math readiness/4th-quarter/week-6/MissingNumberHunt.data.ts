// Spoken lines for Missing Number Hunt; the jungle river and stepping stones are drawn with CSS, no image assets to ship.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Which number is missing?";
export const REVEAL_TEXT = "This is the correct answer!";

const say = (sequence: (number | null)[]) => sequence.map((n) => (n === null ? "blank" : String(n))).join(", ");

export function promptSpeech(sequence: (number | null)[]): string {
  return `Help the monkey cross the river! Count the stones: ${say(sequence)}. One stone is missing. Tap the number that belongs there.`;
}

export function correctSpeech(missing: number): string {
  return `Yes! ${missing} was missing. The monkey can cross!`;
}

export function revealSpeech(missing: number): string {
  return `This is the correct answer! ${missing} was the missing number.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You found ${score} out of ${total} missing numbers.`;
}
