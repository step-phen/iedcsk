import { z } from "zod";
import type { SubmittedAnswer } from "@/types/activity";

// Round artwork lives in public/images/activities/what-begins-with-cc/.
export const ASSETS = {
  background: "/images/activities/what-begins-with-cc/UI-assets/what-begins-with-cc-background.webp",
  titleBanner: "/images/activities/what-begins-with-cc/UI-assets/what-begins-with-cc-title-banner.webp",
  instructionBanner: "/images/activities/what-begins-with-cc/UI-assets/what-begins-with-cc-instruction-banner.webp",
  speakerButton: "/images/activities/what-begins-with-cc/UI-assets/what-begins-with-cc-speaker-button.webp",
  starContainer: "/images/activities/what-begins-with-cc/UI-assets/star-container.webp",
};

/** Picture files are named after the word, so new rounds need no code change. */
export function pictureAsset(word: string): string {
  return `/images/activities/what-begins-with-cc/pictures/${word}.webp`;
}

// Stands in until a word's webp picture lands; every seeded word needs an entry.
export const PICTURE_EMOJI: Record<string, string> = {
  cat: "🐱",
  cup: "🥤",
  car: "🚗",
  cow: "🐄",
  cake: "🍰",
  dog: "🐶",
  sun: "☀️",
  ball: "⚽",
  fish: "🐟",
  hat: "🎩",
  egg: "🥚",
};

/** Spoken and labelled form of a round's word. */
export function wordLabel(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export type Choice = { word: string; isCorrect: boolean };

export type Round = {
  id: string;
  choices: Choice[];
};

export const SPEECH = {
  instruction:
    "Look at the pictures and tap the one whose name begins with the C sound.",
  wrong: "Oops! Listen for the C sound.",
  completeAssisted: "Great work! You finished all the C pictures!",
  complete: "Amazing! You found every picture that begins with C!",
};

function correctFeedback(word: string): string {
  return `Great job! ${wordLabel(word)} begins with the C sound!`;
}

function revealFeedback(word: string): string {
  return `This is ${wordLabel(word)}. It begins with the C sound.`;
}

function completionFeedback(earnedStars: number, totalStars: number): string {
  const celebration = earnedStars === totalStars ? SPEECH.complete : SPEECH.completeAssisted;
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

function beginsWithC(word: string): boolean {
  return word.charAt(0).toLowerCase() === "c";
}

/** Preserve database question keys so the existing server grader can score taps. */
export function buildRounds(input: unknown): Round[] {
  const rows = z.array(questionSchema).length(5).parse(input);
  const ids = new Set<string>();
  return [...rows]
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((row) => {
      const { choices } = row.questionData;
      const answer = row.correctAnswer.answer;
      if (ids.has(row.questionKey)) throw new Error("Duplicate round ID");
      ids.add(row.questionKey);
      if (new Set(choices).size !== choices.length) {
        throw new Error("A round repeats the same picture");
      }
      // Exactly one Cc picture per round, and it has to be the graded answer.
      if (!choices.includes(answer) || choices.filter(beginsWithC).length !== 1 || !beginsWithC(answer)) {
        throw new Error("Round data does not match the activity answer key");
      }
      return {
        id: row.questionKey,
        choices: choices.map((word) => ({ word, isCorrect: word === answer })),
      };
    });
}

export type WhatBeginsWithCcState = {
  roundIndex: number;
  correctIds: string[];
  assistedIds: string[];
  wrongWord: string | null;
  feedback: string;
  attempt: number;
  consecutiveWrong: number;
  hintAttempt: number | null;
};

export const INITIAL_STATE: WhatBeginsWithCcState = {
  roundIndex: 0,
  correctIds: [],
  assistedIds: [],
  wrongWord: null,
  feedback: "",
  attempt: 0,
  consecutiveWrong: 0,
  hintAttempt: null,
};

/** Assisted rounds stay in the five-question total but earn no credit. */
export function buildSubmission(
  state: Pick<WhatBeginsWithCcState, "correctIds" | "assistedIds">,
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
  state: WhatBeginsWithCcState,
  action: Action,
  rounds: readonly Round[],
): WhatBeginsWithCcState {
  if (action.type === "clear-wrong") return { ...state, wrongWord: null };
  if (action.type === "clear-hint") {
    // An older timer must not dismiss a hint triggered by a newer tap.
    return state.hintAttempt === action.attempt
      ? { ...state, hintAttempt: null }
      : state;
  }
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
          ? completionFeedback(correctIds.length, rounds.length)
          : correctFeedback(choice.word),
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
    // Name the picture as soon as it is shown. If it ends the round set,
    // identify it before the celebration and completion callback.
    feedback: revealed
      ? remaining === 0
        ? `${revealFeedback(answer)} ${completionFeedback(state.correctIds.length, rounds.length)}`
        : `${revealFeedback(answer)} ${remaining} more to go!`
      : SPEECH.wrong,
    attempt,
    consecutiveWrong: revealed ? 0 : consecutiveWrong,
    hintAttempt: consecutiveWrong >= 2 && !revealed ? attempt : null,
  };
}
