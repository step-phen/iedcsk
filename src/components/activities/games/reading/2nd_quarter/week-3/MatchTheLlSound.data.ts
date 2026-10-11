import { z } from "zod";
import type { SubmittedAnswer } from "@/types/activity";

export function pictureAsset(word: string): string {
  return `/images/activities/pictures/${word}.webp`;
}

// Stands in until a word's webp picture lands; every seeded word needs an entry.
export const PICTURE_EMOJI: Record<string, string> = {
  leaf: "🍃",
  lion: "🦁",
  lamp: "💡",
  leg: "🦵",
  lemon: "🍋",
  cat: "🐱",
  cup: "🥤",
  dog: "🐶",
  sun: "☀️",
  ball: "⚽",
  fish: "🐟",
  egg: "🥚",
};

/** Spoken and labelled form of a picture's word. */
export function wordLabel(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Shared "drag every X picture onto the letter X" board. The sound being taught
 * is never hardcoded: it is read off the activity's own gradable rows, so a new
 * letter is a registry line plus a seed, with no component copy.
 */
export type PictureTile = {
  id: string;
  word: string;
  isTarget: boolean;
};

/** Folder per letter pair, e.g. hh — artwork the teacher drops in later. */
export function assetsFor(letter: string) {
  const slug = `${letter.toLowerCase()}${letter.toLowerCase()}`;
  const base = `/images/activities/sound-match/${slug}/UI-assets`;
  return {
    background: `${base}/background.webp`,
    titleBanner: `${base}/title-banner.webp`,
    instructionBanner: `${base}/instruction-banner.webp`,
    speakerButton: `${base}/speaker-button.webp`,
    starContainer: `${base}/star-container.webp`,
    letterTarget: `${base}/letter.webp`,
  };
}

export function speechFor(letter: string) {
  const upper = letter.toUpperCase();
  return {
    instruction: `Drag the pictures that begin with the ${upper} sound to the letter ${upper}.`,
    wrong: (tapped: string) =>
      `Oops! ${wordLabel(tapped)} does not begin with the ${upper} sound.`,
    correct: (word: string) => `Great job! ${wordLabel(word)} begins with the ${upper} sound!`,
    reveal: (word: string) => `This is ${wordLabel(word)}. It begins with the ${upper} sound.`,
    completeAssisted: `Great work! You finished the ${upper} board!`,
    complete: `Amazing! You found every picture that begins with ${upper}!`,
    idle: `Drag every ${upper} picture to the letter ${upper}!`,
  };
}

function completionFeedback(
  speech: ReturnType<typeof speechFor>,
  earnedStars: number,
  totalStars: number,
): string {
  const celebration = earnedStars === totalStars ? speech.complete : speech.completeAssisted;
  return `${celebration} You earned ${earnedStars} out of ${totalStars} stars!`;
}

const questionSchema = z.object({
  questionKey: z.string().min(1),
  questionOrder: z.number().int(),
  questionData: z.object({
    word: z.string().regex(/^[a-z]+$/),
    gradable: z.boolean(),
  }),
  correctAnswer: z.object({ answer: z.string() }),
});

/** Preserve database question keys so the existing server grader can score drops. */
export function buildPictures(input: unknown): PictureTile[] {
  const rows = z.array(questionSchema).min(8).max(12).parse(input);
  const ids = new Set<string>();
  const tiles = rows
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((row) => {
      const { word, gradable } = row.questionData;
      if (ids.has(row.questionKey)) throw new Error("Duplicate picture ID");
      ids.add(row.questionKey);
      // The server excludes gradable:false distractors from score and total.
      if (gradable && row.correctAnswer.answer !== word) {
        throw new Error("Picture data does not match the activity answer key");
      }
      return { id: row.questionKey, word, isTarget: gradable };
    });
  const targets = tiles.filter((tile) => tile.isTarget);
  const sounds = new Set(targets.map((tile) => tile.word.charAt(0)));
  if (sounds.size !== 1) throw new Error("A board teaches exactly one sound");
  const sound = [...sounds][0];
  // A distractor sharing the sound would make two answers correct for one drop.
  if (tiles.some((tile) => !tile.isTarget && tile.word.startsWith(sound))) {
    throw new Error("A distractor begins with the taught sound");
  }
  if (targets.length === tiles.length) {
    throw new Error("The board needs distractors");
  }
  return tiles;
}

/** The sound this board teaches, read back off its own graded tiles. */
export function taughtSound(tiles: readonly PictureTile[]): string {
  return tiles.find((tile) => tile.isTarget)!.word.charAt(0).toUpperCase();
}

export type MatchTheLlSoundState = {
  foundIds: string[];
  assistedIds: string[];
  wrongId: string | null;
  feedback: string;
  attempt: number;
  consecutiveWrong: number;
  hintAttempt: number | null;
};

export const INITIAL_STATE: MatchTheLlSoundState = {
  foundIds: [],
  assistedIds: [],
  wrongId: null,
  feedback: "",
  attempt: 0,
  consecutiveWrong: 0,
  hintAttempt: null,
};

/** Assisted pictures stay in the question total but earn no credit. */
export function buildSubmission(
  state: Pick<MatchTheLlSoundState, "foundIds" | "assistedIds">,
  tiles: readonly PictureTile[],
): SubmittedAnswer[] {
  return tiles
    .filter((tile) => tile.isTarget && (state.foundIds.includes(tile.id) || state.assistedIds.includes(tile.id)))
    .map((tile) => ({
      questionId: tile.id,
      response: state.assistedIds.includes(tile.id) ? "__assisted__" : tile.word,
    }));
}

type Action =
  | { type: "drop"; id: string }
  | { type: "clear-wrong" }
  | { type: "clear-hint"; attempt: number };

/** Pure transitions make batched/rapid drops safe without counting a tile twice. */
export function selectPicture(
  state: MatchTheLlSoundState,
  action: Action,
  tiles: readonly PictureTile[],
): MatchTheLlSoundState {
  if (action.type === "clear-wrong") return { ...state, wrongId: null };
  if (action.type === "clear-hint") {
    // An older timer must not dismiss a hint triggered by a newer drop.
    return state.hintAttempt === action.attempt
      ? { ...state, hintAttempt: null }
      : state;
  }
  const speech = speechFor(taughtSound(tiles));
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
    // Each group of four mistakes moves one answer across without a star.
    const revealed = consecutiveWrong >= 4 ? remaining[0] : undefined;
    const assistedIds = revealed ? [...state.assistedIds, revealed.id] : state.assistedIds;
    const remainingCount = targetCount - state.foundIds.length - assistedIds.length;
    return {
      foundIds: state.foundIds,
      assistedIds,
      wrongId: tile.id,
      // Name the picture as soon as it is moved. If it finishes the board,
      // identify it before the celebration and completion callback.
      feedback: revealed
        ? remainingCount === 0
          ? `${speech.reveal(revealed.word)} ${completionFeedback(speech, state.foundIds.length, targetCount)}`
          : `${speech.reveal(revealed.word)} Find ${remainingCount} more!`
        : speech.wrong(tile.word),
      attempt,
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
        : speech.correct(tile.word),
    attempt,
    consecutiveWrong: 0,
    hintAttempt: null,
  };
}
