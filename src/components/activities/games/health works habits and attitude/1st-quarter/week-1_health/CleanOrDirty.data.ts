import { ordinal } from "@/hooks/useSpeech";

// Game artwork lives in public/images/activities/clean-or-dirty/.
const FOLDER = "/images/activities/clean-or-dirty";

export const ASSETS = {
  background: "/images/activities/clean-or-dirty/clean-or-dirty-bg.jpg",
};

export type Choice = "clean" | "dirty";

// Keyed by the DB question_key, which only says whether the picture is clean or dirty; the DB answer is what grades.
export const PICTURES: Record<string, { name: string; src: string }> = {
  "washing-hands": { name: "WASHING HANDS", src: `${FOLDER}/washing-hands.jpg` },
  "brushing-teeth": { name: "BRUSHING TEETH", src: `${FOLDER}/brushing-teeth.jpg` },
  "washing-face": { name: "WASHING FACE", src: `${FOLDER}/washing-face.jpg` },
  "muddy-hands": { name: "MUDDY HANDS", src: `${FOLDER}/muddy-hands.jpg` },
  "dirty-teeth": { name: "DIRTY TEETH", src: `${FOLDER}/dirty-teeth.jpg` },
};

// The two answer buttons are pictures (trimmed to the button's own edge), so the label is only for screen readers.
export const BINS: Record<Choice, { label: string; src: string }> = {
  clean: { label: "CLEAN", src: "/images/buttons/clean-button.webp" },
  dirty: { label: "DIRTY", src: "/images/buttons/dirty-button.webp" },
};

// The shortest time the answer stays on screen; the next picture comes once the spoken answer has also finished, and a miss stays longer so the child can see which bin was right.
export const CORRECT_PAUSE_MS = 2000;
export const WRONG_PAUSE_MS = 3200;

// Everything the game says aloud besides the shared greeting and intro in lib/speech-lines.ts.

/** "WASHING HANDS" -> "Washing hands", easier to read than all caps. */
export const friendlyName = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();

export const promptSpeech = (name: string) => `${friendlyName(name)}. Is it clean or dirty?`;

/** The question for picture number `index` (0-based), led in by "Now the 2nd picture" so it does not start abruptly. */
export function questionSpeech(index: number, total: number, name: string): string {
  if (index === 0) return promptSpeech(name);
  const lead = index === total - 1 ? "Okay, for the last picture." : `Now let's look at the ${ordinal(index + 1)} picture.`;
  return `${lead} ${promptSpeech(name)}`;
}

/** The feedback shown after an answer; a miss also names the right answer, since that is when the child learns it. */
export function feedbackText(isCorrect: boolean, clean: boolean): string {
  return isCorrect ? "Great job!" : `Good try! It is ${clean ? "CLEAN" : "DIRTY"}`;
}

/** Said aloud exactly as shown on screen, with the answer word in lower case so it is read as a word. */
export function answerSpeech(isCorrect: boolean, clean: boolean): string {
  return `${feedbackText(isCorrect, clean).replace(/CLEAN|DIRTY/, (word) => word.toLowerCase())}.`;
}

export function resultSpeech(score: number, total: number): string {
  const head = score === total ? "Wow, you got them all right!" : score >= Math.ceil(total * 0.6) ? "Great job!" : "Good try! Let's practice more.";
  return `${head} You got ${score} out of ${total}.`;
}
