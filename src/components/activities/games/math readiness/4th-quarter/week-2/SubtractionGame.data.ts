// Spoken lines for Subtraction Game; the felt board, counters and cup are drawn with CSS, no image assets to ship.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export function removeText(remove: number): string {
  return `Take away ${remove} ${remove === 1 ? "counter" : "counters"}!`;
}

export const PICK_TEXT = "How many counters are left?";
export const REVEAL_TEXT = "This is the correct answer!";

export function removeSpeech(start: number, remove: number): string {
  return `Here are ${start} counters. Take away ${remove}. Tap ${remove} ${remove === 1 ? "counter" : "counters"} to drop ${remove === 1 ? "it" : "them"} in the cup.`;
}

export const PICK_SPEECH = "Now tap the number that shows how many counters are left. If none are left, tap zero.";

export function correctSpeech(start: number, remove: number): string {
  const left = start - remove;
  return left === 0 ? `Yes! ${start} take away ${remove} leaves zero. No counters are left!` : `Yes! ${start} take away ${remove} leaves ${left}!`;
}

export function revealSpeech(start: number, remove: number): string {
  const left = start - remove;
  return left === 0 ? `This is the correct answer! ${start} take away ${remove} leaves zero.` : `This is the correct answer! ${start} take away ${remove} leaves ${left}.`;
}

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${resultHeadline(score, total)} You took away and counted ${score} out of ${total} boards correctly.`;
}
