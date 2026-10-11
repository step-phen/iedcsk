import { z } from "zod";
import type { SubmittedAnswer } from "@/types/activity";

// Flower artwork lives in public/images/activities/find-the-bb/letter-flower/.
// Empty decorative paths use the existing text/icon fallbacks.
export const ASSETS = {
  background: "/images/activities/find-the-bb/find-the-bb-bg.webp",
  titleBanner: "/images/activities/find-the-bb/UI-assets/find-the-bb-title-banner.webp",
  instructionBanner: "/images/activities/find-the-bb/UI-assets/find-the-bb-instruction-banner.webp",
  speakerButton: "/images/activities/find-the-bb/UI-assets/ind-the-bb-speaker-button.webp",
  starContainer: "/images/activities/find-the-bb/UI-assets/ind-the-bb-star-container.webp",
  flowers: {
    uppercaseB: "/images/activities/find-the-bb/letter-flower/uppercaseB.webp",
    lowercaseB: "/images/activities/find-the-bb/letter-flower/lowercaseB.webp",
    lowercaseD: "/images/activities/find-the-bb/letter-flower/lowercaseD.webp",
    uppercaseP: "/images/activities/find-the-bb/letter-flower/uppercaseP.webp",
    uppercaseA: "/images/activities/find-the-bb/letter-flower/uppercaseA.webp",
    lowercaseQ: "/images/activities/find-the-bb/letter-flower/lowercaseQ.webp",
    uppercaseC: "/images/activities/find-the-bb/letter-flower/uppercaseC.webp",
    lowercaseP: "/images/activities/find-the-bb/letter-flower/lowercaseP.webp",
    uppercaseD: "/images/activities/find-the-bb/letter-flower/uppercaseD.webp",
  },
};

const LETTER_ASSET_KEYS = {
  B: "uppercaseB",
  b: "lowercaseB",
  d: "lowercaseD",
  P: "uppercaseP",
  A: "uppercaseA",
  q: "lowercaseQ",
  C: "uppercaseC",
  p: "lowercaseP",
  D: "uppercaseD",
} as const satisfies Record<string, keyof typeof ASSETS.flowers>;

export type LetterTile = {
  id: string;
  letter: keyof typeof LETTER_ASSET_KEYS;
  isTarget: boolean;
  assetKey: keyof typeof ASSETS.flowers;
};

export const SPEECH = {
  instruction: "Look at the letters and tap all uppercase B and lowercase b.",
  uppercase: "Great job! You found uppercase B!",
  lowercase: "Great job! You found lowercase b!",
  wrong: "Oops! Look for B or b.",
  showUppercase: "This is B.",
  showLowercase: "This is b.",
  completeAssisted: "Great work! You finished the letter garden!",
  complete: "Amazing! You found all the B’s and b’s!",
};

function completionFeedback(earnedStars: number, totalStars: number): string {
  const celebration = earnedStars === totalStars ? SPEECH.complete : SPEECH.completeAssisted;
  return `${celebration} You earned ${earnedStars} out of ${totalStars} stars!`;
}

const questionSchema = z.object({
  questionKey: z.string().min(1),
  questionOrder: z.number().int(),
  questionData: z.object({
    letter: z.enum(["B", "b", "d", "P", "A", "q", "C", "p", "D"]),
    gradable: z.boolean(),
  }),
  correctAnswer: z.object({ answer: z.string() }),
});

/** Preserve database question keys so the existing server grader can score taps. */
export function buildLetters(input: unknown): LetterTile[] {
  const rows = z.array(questionSchema).min(8).max(12).parse(input);
  const ids = new Set<string>();
  const tiles = [...rows]
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((row) => {
      const letter = row.questionData.letter;
      const isTarget = letter === "B" || letter === "b";
      if (ids.has(row.questionKey)) throw new Error("Duplicate letter ID");
      ids.add(row.questionKey);
      // The server excludes gradable:false distractors from score and total.
      if (
        row.questionData.gradable !== isTarget ||
        (isTarget && row.correctAnswer.answer !== letter)
      ) {
        throw new Error("Letter data does not match the activity answer key");
      }
      return {
        id: row.questionKey,
        letter,
        isTarget,
        assetKey: LETTER_ASSET_KEYS[letter],
      };
    });
  if (
    !tiles.some((tile) => tile.letter === "B") ||
    !tiles.some((tile) => tile.letter === "b") ||
    !tiles.some((tile) => !tile.isTarget)
  ) {
    throw new Error(
      "The round needs uppercase B, lowercase b, and distractors",
    );
  }
  return tiles;
}

export type FindTheBbState = {
  foundIds: string[];
  wrongId: string | null;
  feedback: string;
  attempt: number;
  consecutiveWrong: number;
  hintAttempt: number | null;
  assistedIds: string[];
};

export const INITIAL_STATE: FindTheBbState = {
  foundIds: [],
  wrongId: null,
  feedback: "",
  attempt: 0,
  consecutiveWrong: 0,
  hintAttempt: null,
  assistedIds: [],
};

/** Assisted answers stay in the five-question total but earn no credit. */
export function buildSubmission(
  state: Pick<FindTheBbState, "foundIds" | "assistedIds">,
  tiles: readonly LetterTile[],
): SubmittedAnswer[] {
  return tiles
    .filter((tile) => tile.isTarget && (state.foundIds.includes(tile.id) || state.assistedIds.includes(tile.id)))
    .map((tile) => ({
      questionId: tile.id,
      response: state.assistedIds.includes(tile.id) ? "__assisted__" : tile.letter,
    }));
}

type Action =
  | { type: "tap"; id: string }
  | { type: "clear-wrong" }
  | { type: "clear-hint"; attempt: number };

/** Pure transitions make batched/rapid taps safe without counting a tile twice. */
export function selectLetter(
  state: FindTheBbState,
  action: Action,
  tiles: readonly LetterTile[],
): FindTheBbState {
  if (action.type === "clear-wrong") return { ...state, wrongId: null };
  if (action.type === "clear-hint") {
    // An older timer must not dismiss a hint triggered by a newer tap.
    return state.hintAttempt === action.attempt
      ? { ...state, hintAttempt: null }
      : state;
  }
  const targetCount = tiles.filter((tile) => tile.isTarget).length;
  const tile = tiles.find((item) => item.id === action.id);
  if (
    !tile ||
    state.foundIds.length + state.assistedIds.length === targetCount ||
    state.foundIds.includes(tile.id) ||
    state.assistedIds.includes(tile.id)
  )
    return state;
  if (!tile.isTarget) {
    const consecutiveWrong = state.consecutiveWrong + 1;
    const attempt = state.attempt + 1;
    const remaining = tiles.filter(
      (item) => item.isTarget && !state.foundIds.includes(item.id) && !state.assistedIds.includes(item.id),
    );
    // Prefer a lowercase b; use uppercase B if all lowercase letters are found.
    const revealedId = consecutiveWrong >= 4
      ? remaining.find((item) => item.letter === "b")?.id ?? remaining[0]?.id ?? null
      : null;
    const assistedIds = revealedId ? [...state.assistedIds, revealedId] : state.assistedIds;
    const remainingCount = targetCount - state.foundIds.length - assistedIds.length;
    const revealedLetter = remaining.find((item) => item.id === revealedId);
    const helpFeedback = revealedLetter?.letter === "b"
      ? SPEECH.showLowercase
      : SPEECH.showUppercase;
    return {
      ...state,
      wrongId: tile.id,
      // Say the letter as soon as it is checked. If it finishes the board,
      // identify it before the celebration and completion callback.
      feedback: revealedLetter
        ? remainingCount === 0
          ? `${helpFeedback} ${completionFeedback(state.foundIds.length, targetCount)}`
          : `${helpFeedback} Find ${remainingCount} more!`
        : SPEECH.wrong,
      attempt,
      // Each group of four mistakes checks one answer without awarding a star.
      consecutiveWrong: revealedId ? 0 : consecutiveWrong,
      hintAttempt: consecutiveWrong >= 2 && !revealedId ? attempt : null,
      assistedIds,
    };
  }
  const foundIds = [...state.foundIds, tile.id];
  return {
    foundIds,
    wrongId: null,
    feedback:
      foundIds.length + state.assistedIds.length === targetCount
        ? completionFeedback(foundIds.length, targetCount)
        : tile.letter === "B"
          ? SPEECH.uppercase
          : SPEECH.lowercase,
    attempt: state.attempt + 1,
    consecutiveWrong: 0,
    hintAttempt: null,
    assistedIds: state.assistedIds,
  };
}
