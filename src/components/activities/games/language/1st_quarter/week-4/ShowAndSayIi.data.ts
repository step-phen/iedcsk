// Letters and spoken lines for Show and Say Ii; the shared greeting and intro stay in lib/speech-lines.ts.

export const LETTER = { upper: "I", lower: "i" };

// The answer the game sends for a round where both letters were found with no wrong igloo; matches the seeder.
export const BOTH_FOUND = `${LETTER.upper}+${LETTER.lower}`;

export const INSTRUCTION = "Find big I and small i, then say the letter name!";

export const PROMPT = "Find big I and small i.";

export const WRONG = "Oops, that's not it.";

export const DONE_TEXT = "The whole igloo village is glowing! You know the letter Ii!";

const SAY_IT = `Say it with me: ${LETTER.upper}!`;

/** Said as each igloo lights up; the second find also says the round is done. */
export function foundSpeech(letter: string, last: boolean): string {
  const name = letter === LETTER.upper ? "Big I!" : "Small i!";
  return last ? `${name} That's correct! ${SAY_IT}` : name;
}

/** Said after a miss, as the igloos still dark light up. */
export const REVEAL = `Here are big I and small i. ${SAY_IT}`;

export function resultSpeech(score: number, total: number): string {
  return `${DONE_TEXT} You got ${score} out of ${total}.`;
}
