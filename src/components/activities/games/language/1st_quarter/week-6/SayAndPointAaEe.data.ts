// Friends and spoken lines for Say and Point: Aa and Ee; the shared greeting and intro stay in lib/speech-lines.ts.

const ITEMS = "/images/activities/vowel-review/items";

export type FriendId = "a" | "e";

// Each friend eats only cookies with its own letter, big or small; reuses the Vowel Review picture art.
export const FRIENDS: { id: FriendId; name: string; label: string; image: string }[] = [
  { id: "a", name: "Ant", label: "Aa", image: `${ITEMS}/ant.webp` },
  { id: "e", name: "Elephant", label: "Ee", image: `${ITEMS}/elephant.webp` },
];

export const INSTRUCTION = "Feed the cookie to the friend with the same letter!";

// Never names the letter, so the child has to tell A from E by looking.
export const PROMPT = "Who eats this cookie? Ant or Elephant?";

export const WRONG = "Oops, not that friend!";

export const DONE_TEXT = "Yum! Ant and Elephant are full! You know Aa and Ee!";

const letterName = (letter: string) => `${letter === letter.toUpperCase() ? "big" : "small"} ${letter}`;

const sayIt = (letter: string) => `Say it with me: ${letter.toUpperCase()}!`;

export function rightSpeech(letter: string): string {
  return `Yum! That's correct! This is ${letterName(letter)}. ${sayIt(letter)}`;
}

/** Said after a miss, as the cookie goes to the right friend. */
export function revealSpeech(letter: string, friend: string): string {
  return `This is ${letterName(letter)}. It is for ${friend}. ${sayIt(letter)}`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
