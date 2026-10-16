// Chick colors and spoken lines for the Language Consonant Partners (Mama Hen); the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// One chick color per spot, so the right chick is never told apart by color.
export const CHICK_COLORS = ["#ffe066", "#ffd8a8", "#fff3bf"];

export const INSTRUCTION = "Tap the baby chick with the small letter partner!";

export const LOADING = "The chicks are hatching…";

/** The big letter is on the screen, so the voice only names it; the child finds its small partner by looking. */
export function promptSpeech(target: string): string {
  return `Mama Hen has big ${target}. Which baby chick is her partner?`;
}

export function correctSpeech(target: string): string {
  return `Peep peep! Small ${target.toLowerCase()} goes with big ${target}!`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(target: string): string {
  return `${REVEAL} Small ${target.toLowerCase()} goes with big ${target}.`;
}

export const DONE = "Cluck cluck! Every chick found its mama!";

export const DONE_MISSED = "Good try! Let's keep matching big and small letters.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You matched ${score} out of ${total} letters.`;
}
