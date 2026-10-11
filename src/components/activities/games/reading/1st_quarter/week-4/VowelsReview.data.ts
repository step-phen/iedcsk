// Pictures, baskets and spoken lines for Vowel Baskets; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/vowel-review/items";

export const ASSETS = {
  background: "/images/background-images/vowel-review-bg.jpg",
  basket: "/images/activities/vowel-review/train/basket.webp",
};

export type Vowel = "a" | "e" | "i" | "o" | "u";

// The short sound each basket says aloud, spelled for the TTS voice; tune by ear if a sound comes out as the letter name.
export const VOWELS: { id: Vowel; label: string; sound: string }[] = [
  { id: "a", label: "Aa", sound: "aah" },
  { id: "e", label: "Ee", sound: "eh" },
  { id: "i", label: "Ii", sound: "ih" },
  { id: "o", label: "Oo", sound: "aw" },
  { id: "u", label: "Uu", sound: "uh" },
];

// Keyed by the question_key the seeder stores; the answer key itself stays on the server.
export const WORDS: Record<string, { name: string; image: string }> = {
  apple: { name: "Apple", image: `${ITEMS}/apple.webp` },
  ant: { name: "Ant", image: `${ITEMS}/ant.webp` },
  egg: { name: "Egg", image: `${ITEMS}/egg.webp` },
  elephant: { name: "Elephant", image: `${ITEMS}/elephant.webp` },
  insect: { name: "Insect", image: `${ITEMS}/insect.webp` },
  ink: { name: "Ink", image: `${ITEMS}/ink.webp` },
  octopus: { name: "Octopus", image: `${ITEMS}/octopus.webp` },
  ox: { name: "Ox", image: `${ITEMS}/ox.webp` },
  umbrella: { name: "Umbrella", image: `${ITEMS}/umbrella.webp` },
  up: { name: "Up", image: `${ITEMS}/up-arrow.webp` },
};

export const INSTRUCTION = "Listen, then put the picture in the correct vowel basket.";

// After a miss: said while the X shows, then CORRECT_LEAD leads into the right answer as the picture flies to its basket.
export const WRONG = "Oops, not that basket!";

export const CORRECT_LEAD = "It goes here.";

// Said first after a right pick, before the vowel-sound line.
export const RIGHT = "That's correct!";

export const DONE_TEXT = "Great job! You sorted all the vowel pictures!";

export function resultSpeech(correct: number, total: number): string {
  return `${DONE_TEXT} You got ${correct} out of ${total} correct.`;
}

/** Names the vowel and then makes its short sound, so the child hears the sound and not only the letter name. */
export function correctSpeech(name: string, vowel: (typeof VOWELS)[number]): string {
  return `${name} begins with the short ${vowel.id.toUpperCase()} sound! ${vowel.sound}, ${vowel.sound}, ${name.toLowerCase()}.`;
}
