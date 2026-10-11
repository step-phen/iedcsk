// Pictures, bus stops and spoken lines for Vowel Picture Sort; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/vowel-review/items";

export type Vowel = "a" | "e" | "i" | "o" | "u";

// One bus stop per vowel; `sound` is the short sound spelled for the TTS voice, tune by ear if it comes out as the letter name.
export const STOPS: { id: Vowel; label: string; sound: string; color: string }[] = [
  { id: "a", label: "Aa", sound: "aah", color: "#ff6b6b" },
  { id: "e", label: "Ee", sound: "eh", color: "#ffa62b" },
  { id: "i", label: "Ii", sound: "ih", color: "#9b6bff" },
  { id: "o", label: "Oo", sound: "aw", color: "#3d9bff" },
  { id: "u", label: "Uu", sound: "uh", color: "#ff6fc1" },
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

export const INSTRUCTION = "Listen, then tap the bus stop with the beginning vowel!";

export const RIGHT = "That's correct!";

export const WRONG = "Oops, wrong stop!";

export const DONE_TEXT = "Beep beep! Every picture found its vowel stop!";

export function promptSpeech(picture: string): string {
  const name = PICTURES[picture].name;
  return `${name}. Which vowel stop does ${name.toLowerCase()} get off at?`;
}

/** Makes the short sound, then names the stop, so the child links the sound to the group. */
export function stopSpeech(picture: string, stop: (typeof STOPS)[number]): string {
  const name = PICTURES[picture].name;
  return `${name} starts with ${stop.sound}, ${stop.sound}. ${name} rides to the ${stop.id.toUpperCase()} stop!`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
