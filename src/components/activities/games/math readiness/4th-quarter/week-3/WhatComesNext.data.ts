// Number train and spoken lines for What Comes Next?; the cars are drawn with CSS, no image assets to ship.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const INSTRUCTION = "Tap the numeral that comes next!";

export function promptSpeech(sequence: readonly number[]): string {
  return `Count the train cars: ${sequence.join(", ")}. Now tap the number that comes next.`;
}

export function correctSpeech(next: number): string {
  return `Yes! ${next} comes next!`;
}

export const REVEAL_TEXT = "This is the correct answer!";

export function revealSpeech(next: number): string {
  return `This is the correct answer! ${next} comes next.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You completed ${score} out of ${total} trains correctly.`;
}
