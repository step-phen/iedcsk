import { z } from "zod";
import type { SubmittedAnswer } from "@/types/activity";

export function pictureAsset(word: string): string {
  return `/images/activities/pictures/${word}.webp`;
}

// Stands in until a word's webp picture lands; every seeded word needs an entry.
export const PICTURE_EMOJI: Record<string, string> = {
  kite: "🪁",
  key: "🔑",
  king: "🤴",
  kangaroo: "🦘",
  kitten: "🐈",
  dog: "🐶",
  sun: "☀️",
  ball: "⚽",
  fish: "🐟",
  hat: "🎩",
  egg: "🥚",
};

/** Spoken and labelled form of a picture's word. */
export function wordLabel(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Shared "tap the picture that begins with X" board. The sound being taught is
 * never hardcoded: it is read off the seeded answers, so a new letter is a
 * registry line plus a seed, with no component copy.
 */
export type Choice = { word: string; isCorrect: boolean };

export type Round = {
  id: string;
  choices: Choice[];
};

/** Folder per letter pair, e.g. gg — artwork the teacher drops in later. */
export function assetsFor(letter: string) {
  const slug = `${letter.toLowerCase()}${letter.toLowerCase()}`;
  const base = `/images/activities/beginning-sound/${slug}/UI-assets`;
  return {
    background: `${base}/background.webp`,
    titleBanner: `${base}/title-banner.webp`,
    instructionBanner: `${base}/instruction-banner.webp`,
    speakerButton: `${base}/speaker-button.webp`,
    starContainer: `${base}/star-container.webp`,
  };
}

export function speechFor(letter: string) {
  const upper = letter.toUpperCase();
  return {
    instruction: `Look at the pictures and tap the one whose name begins with the ${upper} sound.`,
    wrong: (tapped: string) =>
      `Oops! ${wordLabel(tapped)} does not begin with the ${upper} sound.`,
    correct: (word: string) => `Great job! ${wordLabel(word)} begins with the ${upper} sound!`,
    reveal: (word: string) => `This is ${wordLabel(word)}. It begins with the ${upper} sound.`,
    completeAssisted: `Great work! You finished all the ${upper} pictures!`,
    complete: `Amazing! You found every picture that begins with ${upper}!`,
    idle: `Find the picture that begins with ${upper}!`,
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
    choices: z.array(z.string().regex(/^[a-z]+$/)).length(4),
    gradable: z.literal(true),
  }),
  correctAnswer: z.object({ answer: z.string().min(1) }),
});

/** Preserve database question keys so the existing server grader can score taps. */
export function buildRounds(input: unknown): Round[] {
  const rows = z.array(questionSchema).length(5).parse(input);
  const ids = new Set<string>();
  const rounds = rows
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((row) => {
      const { choices } = row.questionData;
      const answer = row.correctAnswer.answer;
      if (ids.has(row.questionKey)) throw new Error("Duplicate round ID");
      ids.add(row.questionKey);
      if (new Set(choices).size !== choices.length) {
        throw new Error("A round repeats the same picture");
      }
      const sound = answer.charAt(0);
      // Exactly one picture carries the sound, and it has to be the graded answer.
      if (
        !choices.includes(answer) ||
        choices.filter((word) => word.startsWith(sound)).length !== 1
      ) {
        throw new Error("Round data does not match the activity answer key");
      }
      return {
        id: row.questionKey,
        choices: choices.map((word) => ({ word, isCorrect: word === answer })),
      };
    });
  const sounds = new Set(rounds.map((round) => taughtSound([round])));
  if (sounds.size !== 1) throw new Error("A board teaches exactly one sound");
  return rounds;
}

/** The sound this board teaches, read back off its own graded answers. */
export function taughtSound(rounds: readonly Round[]): string {
  return rounds[0].choices.find((choice) => choice.isCorrect)!.word.charAt(0).toUpperCase();
}

export type WhatBeginsWithKkState = {
  roundIndex: number;
  correctIds: string[];
  assistedIds: string[];
  wrongWord: string | null;
  feedback: string;
  attempt: number;
  consecutiveWrong: number;
  hintAttempt: number | null;
};

export const INITIAL_STATE: WhatBeginsWithKkState = {
  roundIndex: 0,
  correctIds: [],
  assistedIds: [],
  wrongWord: null,
  feedback: "",
  attempt: 0,
  consecutiveWrong: 0,
  hintAttempt: null,
};

/** Assisted rounds stay in the question total but earn no credit. */
export function buildSubmission(
  state: Pick<WhatBeginsWithKkState, "correctIds" | "assistedIds">,
  rounds: readonly Round[],
): SubmittedAnswer[] {
  return rounds
    .filter((round) => state.correctIds.includes(round.id) || state.assistedIds.includes(round.id))
    .map((round) => ({
      questionId: round.id,
      response: state.assistedIds.includes(round.id)
        ? "__assisted__"
        : round.choices.find((choice) => choice.isCorrect)!.word,
    }));
}

type Action =
  | { type: "tap"; word: string }
  | { type: "clear-wrong" }
  | { type: "clear-hint"; attempt: number };

/** Pure transitions make batched/rapid taps safe without advancing twice. */
export function selectChoice(
  state: WhatBeginsWithKkState,
  action: Action,
  rounds: readonly Round[],
): WhatBeginsWithKkState {
  if (action.type === "clear-wrong") return { ...state, wrongWord: null };
  if (action.type === "clear-hint") {
    // An older timer must not dismiss a hint triggered by a newer tap.
    return state.hintAttempt === action.attempt
      ? { ...state, hintAttempt: null }
      : state;
  }
  const speech = speechFor(taughtSound(rounds));
  const round = rounds[state.roundIndex];
  const choice = round?.choices.find((item) => item.word === action.word);
  if (!choice) return state;
  const attempt = state.attempt + 1;
  if (choice.isCorrect) {
    const correctIds = [...state.correctIds, round.id];
    const roundIndex = state.roundIndex + 1;
    return {
      roundIndex,
      correctIds,
      assistedIds: state.assistedIds,
      wrongWord: null,
      feedback:
        roundIndex === rounds.length
          ? completionFeedback(speech, correctIds.length, rounds.length)
          : speech.correct(choice.word),
      attempt,
      consecutiveWrong: 0,
      hintAttempt: null,
    };
  }
  const consecutiveWrong = state.consecutiveWrong + 1;
  // Each group of four mistakes shows the answer and moves on without a star.
  const revealed = consecutiveWrong >= 4;
  const assistedIds = revealed ? [...state.assistedIds, round.id] : state.assistedIds;
  const roundIndex = revealed ? state.roundIndex + 1 : state.roundIndex;
  const answer = round.choices.find((item) => item.isCorrect)!.word;
  const remaining = rounds.length - roundIndex;
  return {
    roundIndex,
    correctIds: state.correctIds,
    assistedIds,
    wrongWord: action.word,
    // Name the picture as soon as it is shown. If it ends the board, identify
    // it before the celebration and completion callback.
    feedback: revealed
      ? remaining === 0
        ? `${speech.reveal(answer)} ${completionFeedback(speech, state.correctIds.length, rounds.length)}`
        : `${speech.reveal(answer)} ${remaining} more to go!`
      : speech.wrong(action.word),
    attempt,
    consecutiveWrong: revealed ? 0 : consecutiveWrong,
    hintAttempt: consecutiveWrong >= 2 && !revealed ? attempt : null,
  };
}
