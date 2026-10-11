import { z } from "zod";
import type { SubmittedAnswer } from "@/types/activity";

// Board artwork lives in public/images/activities/match-the-dd-sound/.
export const ASSETS = {
  background: "/images/activities/match-the-dd-sound/UI-assets/background.webp",
  titleBanner: "/images/activities/match-the-dd-sound/UI-assets/title-banner.webp",
  instructionBanner: "/images/activities/match-the-dd-sound/UI-assets/instruction-banner.webp",
  speakerButton: "/images/activities/match-the-dd-sound/UI-assets/speaker-button.webp",
  starContainer: "/images/activities/match-the-dd-sound/UI-assets/star-container.webp",
  letterTarget: "/images/activities/match-the-dd-sound/UI-assets/letter-dd.webp",
};

/** Picture files are named after the word, so new boards need no code change. */
export function pictureAsset(word: string): string {
  return `/images/activities/match-the-dd-sound/pictures/${word}.webp`;
}

// Stands in until a word's webp picture lands; every seeded word needs an entry.
export const PICTURE_EMOJI: Record<string, string> = {
  dog: "🐶",
  duck: "🦆",
  door: "🚪",
  doll: "🪆",
  drum: "🥁",
  cat: "🐱",
  sun: "☀️",
  ball: "⚽",
  fish: "🐟",
  hat: "🎩",
  egg: "🥚",
  cup: "🥤",
};

/** Spoken and labelled form of a picture's word. */
export function wordLabel(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export type PictureTile = {
  id: string;
  word: string;
  isTarget: boolean;
};

export const SPEECH = {
  instruction:
    "Drag the pictures that begin with the D sound to the letter D.",
  wrong: "Oops! Listen for the D sound.",
  completeAssisted: "Great work! You finished the D board!",
  complete: "Amazing! You found every picture that begins with D!",
};

function correctFeedback(word: string): string {
  return `Great job! ${wordLabel(word)} begins with the D sound!`;
}

function revealFeedback(word: string): string {
  return `This is ${wordLabel(word)}. It begins with the D sound.`;
}

function completionFeedback(earnedStars: number, totalStars: number): string {
  const celebration = earnedStars === totalStars ? SPEECH.complete : SPEECH.completeAssisted;
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

function beginsWithD(word: string): boolean {
  return word.charAt(0).toLowerCase() === "d";
}

/** Preserve database question keys so the existing server grader can score drops. */
export function buildPictures(input: unknown): PictureTile[] {
  const rows = z.array(questionSchema).min(8).max(12).parse(input);
  const ids = new Set<string>();
  const tiles = rows
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((row) => {
      const { word } = row.questionData;
      const isTarget = beginsWithD(word);
      if (ids.has(row.questionKey)) throw new Error("Duplicate picture ID");
      ids.add(row.questionKey);
      // The server excludes gradable:false distractors from score and total.
      if (
        row.questionData.gradable !== isTarget ||
        (isTarget && row.correctAnswer.answer !== word)
      ) {
        throw new Error("Picture data does not match the activity answer key");
      }
      return { id: row.questionKey, word, isTarget };
    });
  if (!tiles.some((tile) => tile.isTarget) || !tiles.some((tile) => !tile.isTarget)) {
    throw new Error("The board needs D pictures and distractors");
  }
  return tiles;
}

export type MatchTheDdSoundState = {
  foundIds: string[];
  assistedIds: string[];
  wrongId: string | null;
  feedback: string;
  attempt: number;
  consecutiveWrong: number;
  hintAttempt: number | null;
};

export const INITIAL_STATE: MatchTheDdSoundState = {
  foundIds: [],
  assistedIds: [],
  wrongId: null,
  feedback: "",
  attempt: 0,
  consecutiveWrong: 0,
  hintAttempt: null,
};

/** Assisted pictures stay in the total but earn no credit. */
export function buildSubmission(
  state: Pick<MatchTheDdSoundState, "foundIds" | "assistedIds">,
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
  state: MatchTheDdSoundState,
  action: Action,
  tiles: readonly PictureTile[],
): MatchTheDdSoundState {
  if (action.type === "clear-wrong") return { ...state, wrongId: null };
  if (action.type === "clear-hint") {
    // An older timer must not dismiss a hint triggered by a newer drop.
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
          ? `${revealFeedback(revealed.word)} ${completionFeedback(state.foundIds.length, targetCount)}`
          : `${revealFeedback(revealed.word)} Find ${remainingCount} more!`
        : SPEECH.wrong,
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
        ? completionFeedback(foundIds.length, targetCount)
        : correctFeedback(tile.word),
    attempt,
    consecutiveWrong: 0,
    hintAttempt: null,
  };
}
