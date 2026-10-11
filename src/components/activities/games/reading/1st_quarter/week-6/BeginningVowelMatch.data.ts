// Pictures, flowers and spoken lines for Beginning Vowel Match; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/vowel-review/items";
const ART = "/images/activities/beginning-vowel-match";

export const ASSETS = {
  bee: `${ART}/bee.webp`,
};

export type Vowel = "a" | "e" | "i" | "o" | "u";

// One flower per vowel; `sound` is the short sound spelled for the TTS voice, tune by ear if it comes out as the letter name.
export const FLOWERS: { id: Vowel; label: string; sound: string; image: string }[] = [
  { id: "a", label: "Aa", sound: "aah", image: `${ART}/items/flower-red.webp` },
  { id: "e", label: "Ee", sound: "eh", image: `${ART}/items/flower-orange.webp` },
  { id: "i", label: "Ii", sound: "ih", image: `${ART}/items/flower-purple.webp` },
  { id: "o", label: "Oo", sound: "aw", image: `${ART}/items/flower-blue.webp` },
  { id: "u", label: "Uu", sound: "uh", image: `${ART}/items/flower-pink.webp` },
];

// Keyed by the seeder's question keys; reuses the Vowel Review picture art.
export const PICTURES: Record<string, { name: string; image: string }> = {
  ant: { name: "Ant", image: `${ITEMS}/ant.webp` },
  apple: { name: "Apple", image: `${ITEMS}/apple.webp` },
  egg: { name: "Egg", image: `${ITEMS}/egg.webp` },
  elephant: { name: "Elephant", image: `${ITEMS}/elephant.webp` },
  insect: { name: "Insect", image: `${ITEMS}/insect.webp` },
  ink: { name: "Ink", image: `${ITEMS}/ink.webp` },
  octopus: { name: "Octopus", image: `${ITEMS}/octopus.webp` },
  ox: { name: "Ox", image: `${ITEMS}/ox.webp` },
  umbrella: { name: "Umbrella", image: `${ITEMS}/umbrella.webp` },
  up: { name: "Up", image: `${ITEMS}/up-arrow.webp` },
};

export const INSTRUCTION = "Listen, then tap the flower with the beginning vowel!";

export const RIGHT = "That's correct!";

export const WRONG = "Oops, not that flower!";

export const DONE_TEXT = "Buzz buzz! You found all the beginning vowels!";

export function promptSpeech(picture: string): string {
  const name = PICTURES[picture].name;
  return `${name}. Which vowel does ${name.toLowerCase()} begin with?`;
}

/** Names the vowel, then makes its short sound, so the child hears the sound and not only the letter name. */
export function soundSpeech(picture: string, vowel: (typeof FLOWERS)[number]): string {
  const name = PICTURES[picture].name;
  return `${name} begins with the short ${vowel.id.toUpperCase()} sound! ${vowel.sound}, ${vowel.sound}, ${name.toLowerCase()}.`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
