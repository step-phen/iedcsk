import { z } from "zod";
import type { SubmittedAnswer } from "@/types/activity";

/**
 * Shared "tap every X and x" board. The hunted letter is never hardcoded: it
 * comes from the activity's own gradable rows, so a new letter is a registry
 * line plus a seed, with no component copy.
 */
export type LetterTile = {
  id: string;
  letter: string;
  isTarget: boolean;
};

/** Folder per letter pair, e.g. ff — artwork the teacher drops in later. */
export function assetsFor(letter: string) {
  const slug = `${letter.toLowerCase()}${letter.toLowerCase()}`;
  const base = `/images/activities/letter-hunt/${slug}/UI-assets`;
  return {
    background: `${base}/background.webp`,
    titleBanner: `${base}/title-banner.webp`,
    instructionBanner: `${base}/instruction-banner.webp`,
    speakerButton: `${base}/speaker-button.webp`,
    starContainer: `${base}/star-container.webp`,
  };
}

/** Letter tiles are shared across every hunt, so they live in one folder. */
export function letterAsset(letter: string): string {
  const casing = letter === letter.toUpperCase() ? "uppercase" : "lowercase";
  return `/images/activities/letter-tiles/${casing}${letter.toUpperCase()}.webp`;
}

export function caseName(letter: string): string {
  return letter === letter.toUpperCase() ? "uppercase" : "lowercase";
}

export function speechFor(letter: string) {
  const upper = letter.toUpperCase();
  const lower = letter.toLowerCase();
  return {
    instruction: `Look at the letters and tap all uppercase ${upper} and lowercase ${lower}.`,
    uppercase: `Great job! You found uppercase ${upper}!`,
    lowercase: `Great job! You found lowercase ${lower}!`,
    // Name what was tapped, so the miss teaches the letter instead of just buzzing.
    wrong: (tapped: string) =>
      `Oops! That is ${caseName(tapped)} ${tapped}. Look for uppercase ${upper} or lowercase ${lower}.`,
    showUppercase: `This is ${upper}.`,
    showLowercase: `This is ${lower}.`,
    completeAssisted: "Great work! You finished the letter hunt!",
    complete: `Amazing! You found all the ${upper}'s and ${lower}'s!`,
    idle: `Find all the ${upper}'s and ${lower}'s!`,
  };
}

function completionFeedback(
  speech: ReturnType<typeof speechFor>,
  earnedStars: number,
  totalStars: number,
): string {
  const celebration =
    earnedStars === totalStars ? speech.complete : speech.completeAssisted;
  return `${celebration} You earned ${earnedStars} out of ${totalStars} stars!`;
}

const questionSchema = z.object({
  questionKey: z.string().min(1),
  questionOrder: z.number().int(),
  questionData: z.object({
    letter: z.string().regex(/^[A-Za-z]$/),
    gradable: z.boolean(),
  }),
  correctAnswer: z.object({ answer: z.string() }),
});

/** Preserve database question keys so the existing server grader can score taps. */
export function buildLetters(input: unknown): LetterTile[] {
  const rows = z.array(questionSchema).min(8).max(12).parse(input);
  const ids = new Set<string>();
  const tiles = rows
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((row) => {
      const { letter, gradable } = row.questionData;
      if (ids.has(row.questionKey)) throw new Error("Duplicate letter ID");
      ids.add(row.questionKey);
      // The server excludes gradable:false distractors from score and total.
      if (gradable && row.correctAnswer.answer !== letter) {
        throw new Error("Letter data does not match the activity answer key");
      }
      return { id: row.questionKey, letter, isTarget: gradable };
    });
  const hunted = new Set(
    tiles
      .filter((tile) => tile.isTarget)
      .map((tile) => tile.letter.toUpperCase()),
  );
  if (hunted.size !== 1) {
    throw new Error("A hunt grades exactly one letter");
  }
  if (
    !tiles.some(
      (tile) => tile.isTarget && tile.letter === tile.letter.toUpperCase(),
    ) ||
    !tiles.some(
      (tile) => tile.isTarget && tile.letter === tile.letter.toLowerCase(),
    ) ||
    !tiles.some((tile) => !tile.isTarget)
  ) {
    throw new Error(
      "The hunt needs the uppercase letter, the lowercase letter, and distractors",
    );
  }
  return tiles;
}

/** The letter this board hunts, read back off its own graded tiles. */
export function huntedLetter(tiles: readonly LetterTile[]): string {
  return tiles.find((tile) => tile.isTarget)!.letter.toUpperCase();
}

export type FindTheJjState = {
  foundIds: string[];
  assistedIds: string[];
  wrongId: string | null;
  feedback: string;
  attempt: number;
  consecutiveWrong: number;
  hintAttempt: number | null;
};

export const INITIAL_STATE: FindTheJjState = {
  foundIds: [],
  assistedIds: [],
  wrongId: null,
  feedback: "",
  attempt: 0,
  consecutiveWrong: 0,
  hintAttempt: null,
};

/** Assisted answers stay in the question total but earn no credit. */
export function buildSubmission(
  state: Pick<FindTheJjState, "foundIds" | "assistedIds">,
  tiles: readonly LetterTile[],
): SubmittedAnswer[] {
  return tiles
    .filter(
      (tile) =>
        tile.isTarget &&
        (state.foundIds.includes(tile.id) ||
          state.assistedIds.includes(tile.id)),
    )
    .map((tile) => ({
      questionId: tile.id,
      response: state.assistedIds.includes(tile.id)
        ? "__assisted__"
        : tile.letter,
    }));
}

type Action =
  | { type: "tap"; id: string }
  | { type: "clear-wrong" }
  | { type: "clear-hint"; attempt: number };

/** Pure transitions make batched/rapid taps safe without counting a tile twice. */
export function selectLetter(
  state: FindTheJjState,
  action: Action,
  tiles: readonly LetterTile[],
): FindTheJjState {
  if (action.type === "clear-wrong") return { ...state, wrongId: null };
  if (action.type === "clear-hint") {
    // An older timer must not dismiss a hint triggered by a newer tap.
    return state.hintAttempt === action.attempt
      ? { ...state, hintAttempt: null }
      : state;
  }
  const speech = speechFor(huntedLetter(tiles));
  const targetCount = tiles.filter((tile) => tile.isTarget).length;
  const tile = tiles.find((item) => item.id === action.id);
  if (
    !tile ||
    state.foundIds.length + state.assistedIds.length === targetCount ||
    state.foundIds.includes(tile.id) ||
    state.assistedIds.includes(tile.id)
  )
    return state;
  const attempt = state.attempt + 1;
  if (!tile.isTarget) {
    const consecutiveWrong = state.consecutiveWrong + 1;
    const remaining = tiles.filter(
      (item) =>
        item.isTarget &&
        !state.foundIds.includes(item.id) &&
        !state.assistedIds.includes(item.id),
    );
    // Prefer a lowercase tile; use the uppercase one if none are left.
    const revealed =
      consecutiveWrong >= 4
        ? (remaining.find(
            (item) => item.letter === item.letter.toLowerCase(),
          ) ?? remaining[0])
        : undefined;
    const assistedIds = revealed
      ? [...state.assistedIds, revealed.id]
      : state.assistedIds;
    const remainingCount =
      targetCount - state.foundIds.length - assistedIds.length;
    const helpFeedback =
      revealed && revealed.letter === revealed.letter.toLowerCase()
        ? speech.showLowercase
        : speech.showUppercase;
    return {
      foundIds: state.foundIds,
      assistedIds,
      wrongId: tile.id,
      // Say the letter as soon as it is checked. If it finishes the board,
      // identify it before the celebration and completion callback.
      feedback: revealed
        ? remainingCount === 0
          ? `${helpFeedback} ${completionFeedback(speech, state.foundIds.length, targetCount)}`
          : `${helpFeedback} Find ${remainingCount} more!`
        : speech.wrong(tile.letter),
      attempt,
      // Each group of four mistakes checks one answer without awarding a star.
      consecutiveWrong: revealed ? 0 : consecutiveWrong,
      hintAttempt: consecutiveWrong >= 2 && !revealed ? attempt : null,
    };
  }
  const foundIds = [...state.foundIds, tile.id];
  return {
    foundIds,
    assistedIds: state.assistedIds,
    wrongId: null,
    feedback:
      foundIds.length + state.assistedIds.length === targetCount
        ? completionFeedback(speech, foundIds.length, targetCount)
        : tile.letter === tile.letter.toUpperCase()
          ? speech.uppercase
          : speech.lowercase,
    attempt,
    consecutiveWrong: 0,
    hintAttempt: null,
  };
}
