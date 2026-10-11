// Fish colours and spoken lines for Alphabet Partners; the shared greeting and intro stay in lib/speech-lines.ts.

const FISH = "/images/activities/alphabet-partners";

// One fish per lane, so neighbouring fish never look alike; each faces right with a blank belly patch for the letter.
export const FISH_IMAGES = ["orange", "blue", "pink", "green", "yellow"].map((color) => `${FISH}/fish-${color}.webp`);

export const INSTRUCTION = "Catch the fish with the small letter partner!";

export const RIGHT = "That's correct!";

export const WRONG = "Oops, that's not its partner!";

export const DONE_TEXT = "Great fishing! You found all the letter partners!";

export function promptSpeech(letter: string): string {
  return `Find the partner of big ${letter.toUpperCase()}!`;
}

export function pairSpeech(letter: string): string {
  return `Big ${letter.toUpperCase()} and small ${letter} are partners!`;
}

/** After a miss: points at the right fish, then the pair line follows. */
export function revealLead(letter: string): string {
  return `This is small ${letter}.`;
}

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
