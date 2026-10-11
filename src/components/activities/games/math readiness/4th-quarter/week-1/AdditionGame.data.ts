// Spoken lines for Addition Game; the counters and ten frame are drawn with CSS, no image assets to ship.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const JOIN_TEXT = "Tap each counter to put it on the ten frame!";
export const PICK_TEXT = "How many counters in all?";
export const REVEAL_TEXT = "This is the correct answer!";

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export function joinSpeech(red: number, yellow: number): string {
  return `Here are ${red} red counters and ${yellow} yellow counters. Tap each counter to put it on the ten frame.`;
}

export const PICK_SPEECH = "Now tap the number that shows how many counters in all.";

export function correctSpeech(red: number, yellow: number): string {
  return `Yes! ${red} and ${yellow} make ${red + yellow}!`;
}

export function revealSpeech(red: number, yellow: number): string {
  return `This is the correct answer! ${red} and ${yellow} make ${red + yellow}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You added ${score} out of ${total} ten frames correctly.`;
}
