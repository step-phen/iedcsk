// Objects, groups and spoken lines for Length Sort; the shared greeting and intro stay in lib/speech-lines.ts.

export type Length = "long" | "short";

export const GROUPS: { id: Length; label: string }[] = [
  { id: "long", label: "Long" },
  { id: "short", label: "Short" },
];

// Keyed by the seeder's object ids; emoji stand in until real art exists, then set `image` and it is used instead.
export const OBJECTS: Record<string, { name: string; emoji: string; image?: string }> = {
  snake: { name: "Snake", emoji: "🐍" },
  ladder: { name: "Ladder", emoji: "🪜" },
  scarf: { name: "Scarf", emoji: "🧣" },
  pencil: { name: "Pencil", emoji: "✏️" },
  spoon: { name: "Spoon", emoji: "🥄" },
};

export const INSTRUCTION = "Drag each object into the Long or Short group.";

// Said first after a miss, before the right group is pointed out; no retry, so a miss always ends the round.
export const WRONG = "Oops, that's not where it goes!";

// Said first after a right pick, before the length line.
export const RIGHT = "That's correct!";

// Leads into the length line after a miss, as the object flies to its real group.
export const CORRECT_LEAD = "It goes here.";

export const DONE_TEXT = "Great job! You sorted all the objects!";

export function correctSpeech(object: string, length: Length): string {
  return `The ${OBJECTS[object].name.toLowerCase()} is ${length}!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
