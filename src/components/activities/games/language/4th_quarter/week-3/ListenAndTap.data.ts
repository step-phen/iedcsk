// Farm animals, places and spoken lines for Listen and Tap; the shared greeting and intro stay in lib/speech-lines.ts.

export const ASSETS = {
  starFilled: "/images/activities/number-coloring/star-with-fill.webp",
  starEmpty: "/images/activities/number-coloring/star-without-fill.webp",
};

// Which animals stand in the field and what the farmer asks come from activity_questions.
export const ANIMALS: Record<string, { name: string; emoji: string }> = {
  cow: { name: "cow", emoji: "🐄" },
  pig: { name: "pig", emoji: "🐖" },
  duck: { name: "duck", emoji: "🦆" },
  sheep: { name: "sheep", emoji: "🐑" },
  hen: { name: "hen", emoji: "🐔" },
  horse: { name: "horse", emoji: "🐴" },
  goat: { name: "goat", emoji: "🐐" },
};

export const PLACES = ["pond", "barn"] as const;
export type Place = (typeof PLACES)[number];

export const INSTRUCTION = "Listen to the farmer, then do what she says!";

export const LOADING = "Opening the farm gate…";

export function directionText(kind: "tap" | "move", steps: string[], place?: Place): string {
  if (kind === "move") return `Put the ${ANIMALS[steps[0]].name} in the ${place}.`;
  return steps.map((s, i) => `${i === 0 ? "Tap" : "then tap"} the ${ANIMALS[s].name}`).join(", ") + ".";
}

const CHEERS = ["Yes!", "You got it!", "Great listening!", "That's right!", "Wonderful!"];

export function correctSpeech(roundIndex: number): string {
  return `${CHEERS[roundIndex % CHEERS.length]} You followed the direction.`;
}

export const REVEAL = "This is the correct answer!";

export function revealSpeech(direction: string): string {
  return `${REVEAL} ${direction}`;
}

export const DONE = "Super farm helper! You followed every direction!";

export const DONE_MISSED = "Good helping! Keep listening to every word the farmer says.";

export function resultHeadline(score: number, total: number): string {
  if (score === total) return "Perfect Score!";
  return score >= Math.ceil(total * 0.6) ? "Great Job!" : "Nice Try!";
}

export function resultSpeech(score: number, total: number): string {
  return `${score === total ? DONE : DONE_MISSED} You followed ${score} out of ${total} directions.`;
}
