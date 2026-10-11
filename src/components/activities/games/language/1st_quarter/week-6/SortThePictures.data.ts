// Pictures, boxes and spoken lines for Sort the Pictures; the shared greeting and intro stay in lib/speech-lines.ts.

const SIM = "/images/activities/similarities/asset";
const DIFF = "/images/activities/differences/item";

export type GroupId = "red" | "blue";

// The two boxes; the shared feature is color.
export const GROUPS: { id: GroupId; label: string; color: string }[] = [
  { id: "red", label: "Red", color: "#ef4a4a" },
  { id: "blue", label: "Blue", color: "#3d8bff" },
];

// Keyed by the seeder's question keys; reuses the Similarities and Differences picture art.
export const PICTURES: Record<string, { name: string; image: string }> = {
  apple: { name: "Apple", image: `${SIM}/apple.webp` },
  balloon: { name: "Balloon", image: `${SIM}/balloon.webp` },
  car: { name: "Car", image: `${SIM}/car.webp` },
  ball: { name: "Ball", image: `${SIM}/ball.webp` },
  cup: { name: "Cup", image: `${DIFF}/cup.webp` },
};

export const INSTRUCTION = "Sort by color! Is it red or blue?";

export const WRONG = "Oops, wrong box!";

export const DONE_TEXT = "The sorting factory is all done! Great sorting!";

export function promptSpeech(picture: string): string {
  return `${PICTURES[picture].name}. Is it red or blue?`;
}

export function rightSpeech(picture: string, group: GroupId): string {
  return `That's correct! The ${PICTURES[picture].name.toLowerCase()} is ${group}. It goes in the ${group} box!`;
}

/** Said after a miss, as the picture hops over to the right box. */
export function revealSpeech(picture: string, group: GroupId): string {
  return `The ${PICTURES[picture].name.toLowerCase()} is ${group}. It goes in the ${group} box.`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
