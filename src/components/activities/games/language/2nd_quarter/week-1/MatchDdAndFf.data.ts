import { z } from "zod";
import type { SubmittedAnswer } from "@/types/activity";

/** Artwork the teacher drops in later; every piece has an HTML/canvas fallback. */
export const ASSETS = {
  background: "/images/activities/match-dd-and-ff/UI-assets/background.webp",
  titleBanner: "/images/activities/match-dd-and-ff/UI-assets/title-banner.webp",
  instructionBanner: "/images/activities/match-dd-and-ff/UI-assets/instruction-banner.webp",
  speakerButton: "/images/activities/match-dd-and-ff/UI-assets/speaker-button.webp",
  starContainer: "/images/activities/match-dd-and-ff/UI-assets/star-container.webp",
} as const;

export function rewardAsset(word: string): string {
  return `/images/activities/pictures/${word}.webp`;
}

// Stands in until a reward's webp picture lands; every seeded reward needs one.
export const REWARD_EMOJI: Record<string, string> = {
  dog: "🐶",
  fish: "🐟",
};

/** Spoken and labelled form of a reward word. */
export function wordLabel(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * One short round: the uppercase letters on the left, the lowercase cards on
 * the right, and the reward picture each correct join earns. A round is worth
 * one star, so the mixed final round pays the same as the single-letter ones.
 */
export type RoundTile = {
  id: string;
  prompts: string[];
  choices: string[];
  rewards: Record<string, string>;
  instruction: string;
};

export const SPEECH = {
  instruction: "Match each uppercase letter with its lowercase partner.",
  correct: (round: RoundTile, letter: string) =>
    `${letter} matches ${letter.toLowerCase()}! ${letter} is for ${wordLabel(round.rewards[letter])}.`,
  wrong: "Try again.",
  reveal: (letter: string) => `This is ${letter.toLowerCase()}. It matches ${letter}.`,
  completeAssisted: "Great work! You finished the letter friends!",
  complete: "Amazing! You matched every letter friend!",
  idle: "Drag the uppercase letter to its lowercase friend!",
} as const;

function completionFeedback(earnedStars: number, totalStars: number): string {
  const celebration = earnedStars === totalStars ? SPEECH.complete : SPEECH.completeAssisted;
  return `${celebration} You earned ${earnedStars} out of ${totalStars} stars!`;
}

/** The answer key a round's joins have to spell, e.g. "Dd" or "Dd,Ff". */
export function answerKeyFor(prompts: readonly string[]): string {
  return prompts.map((letter) => `${letter}${letter.toLowerCase()}`).join(",");
}

const questionSchema = z.object({
  questionKey: z.string().min(1),
  questionOrder: z.number().int(),
  questionData: z.object({
    prompts: z.array(z.string().regex(/^[A-Z]$/)).min(1).max(3),
    choices: z.array(z.string().regex(/^[a-z]$/)).min(2).max(4),
    rewards: z.record(z.string(), z.string().regex(/^[a-z]+$/)),
    instruction: z.string().min(1),
    gradable: z.literal(true),
  }),
  correctAnswer: z.object({ answer: z.string().min(1) }),
});

/** Preserve database question keys so the existing server grader can score rounds. */
export function buildRounds(input: unknown): RoundTile[] {
  const rows = z.array(questionSchema).length(5).parse(input);
  const ids = new Set<string>();
  return rows
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .map((row) => {
      const { prompts, choices, rewards, instruction } = row.questionData;
      if (ids.has(row.questionKey)) throw new Error("Duplicate round ID");
      ids.add(row.questionKey);
      if (new Set(prompts).size !== prompts.length) {
        throw new Error("A round repeats the same uppercase letter");
      }
      if (new Set(choices).size !== choices.length) {
        throw new Error("A round repeats the same lowercase letter");
      }
      // Every prompt needs its partner on the board and a picture to reward it.
      for (const letter of prompts) {
        if (!choices.includes(letter.toLowerCase())) {
          throw new Error("A round is missing a lowercase partner");
        }
        const reward = rewards[letter];
        if (!reward || !reward.startsWith(letter.toLowerCase())) {
          throw new Error("The reward picture does not begin with the round's letter");
        }
      }
      if (row.correctAnswer.answer !== answerKeyFor(prompts)) {
        throw new Error("Round data does not match the activity answer key");
      }
      return { id: row.questionKey, prompts, choices, rewards, instruction };
    });
}

export type MatchDdAndFfState = {
  roundIndex: number;
  correctIds: string[];
  assistedIds: string[];
  /** Uppercase letters already joined in the round being played. */
  joined: string[];
  wrongLetter: string | null;
  feedback: string;
  attempt: number;
  consecutiveWrong: number;
  hintAttempt: number | null;
};

export const INITIAL_STATE: MatchDdAndFfState = {
  roundIndex: 0,
  correctIds: [],
  assistedIds: [],
  joined: [],
  wrongLetter: null,
  feedback: "",
  attempt: 0,
  consecutiveWrong: 0,
  hintAttempt: null,
};

/** Assisted rounds stay in the question total but earn no credit. */
export function buildSubmission(
  state: Pick<MatchDdAndFfState, "correctIds" | "assistedIds">,
  rounds: readonly RoundTile[],
): SubmittedAnswer[] {
  return rounds
    .filter((round) => state.correctIds.includes(round.id) || state.assistedIds.includes(round.id))
    .map((round) => ({
      questionId: round.id,
      response: state.assistedIds.includes(round.id)
        ? "__assisted__"
        : answerKeyFor(round.prompts),
    }));
}

type Action =
  | { type: "connect"; from: string; to: string }
  | { type: "clear-wrong" }
  | { type: "clear-hint"; attempt: number };

/** Pure transitions make batched/rapid drops safe without advancing twice. */
export function selectJoin(
  state: MatchDdAndFfState,
  action: Action,
  rounds: readonly RoundTile[],
): MatchDdAndFfState {
  if (action.type === "clear-wrong") return { ...state, wrongLetter: null };
  if (action.type === "clear-hint") {
    // An older timer must not dismiss a hint triggered by a newer drop.
    return state.hintAttempt === action.attempt ? { ...state, hintAttempt: null } : state;
  }
  const round = rounds[state.roundIndex];
  if (
    !round ||
    !round.prompts.includes(action.from) ||
    !round.choices.includes(action.to) ||
    state.joined.includes(action.from)
  )
    return state;
  const attempt = state.attempt + 1;
  if (action.to !== action.from.toLowerCase()) {
    const consecutiveWrong = state.consecutiveWrong + 1;
    // Each group of four mistakes gives the round away and moves on, no star.
    const revealed = consecutiveWrong >= 4;
    const assistedIds = revealed ? [...state.assistedIds, round.id] : state.assistedIds;
    const roundIndex = revealed ? state.roundIndex + 1 : state.roundIndex;
    const remaining = rounds.length - roundIndex;
    const shown = round.prompts.find((letter) => !state.joined.includes(letter))!;
    return {
      roundIndex,
      correctIds: state.correctIds,
      assistedIds,
      joined: revealed ? [] : state.joined,
      wrongLetter: action.from,
      // Name the pair as soon as it is given away. If it ends the board,
      // identify it before the celebration and completion callback.
      feedback: revealed
        ? remaining === 0
          ? `${SPEECH.reveal(shown)} ${completionFeedback(state.correctIds.length, rounds.length)}`
          : `${SPEECH.reveal(shown)} ${remaining} more to go!`
        : SPEECH.wrong,
      attempt,
      consecutiveWrong: revealed ? 0 : consecutiveWrong,
      hintAttempt: consecutiveWrong >= 2 && !revealed ? attempt : null,
    };
  }
  const joined = [...state.joined, action.from];
  // The mixed round only pays its star once every letter on it is joined.
  const roundDone = joined.length === round.prompts.length;
  const correctIds = roundDone ? [...state.correctIds, round.id] : state.correctIds;
  const roundIndex = roundDone ? state.roundIndex + 1 : state.roundIndex;
  return {
    roundIndex,
    correctIds,
    assistedIds: state.assistedIds,
    joined: roundDone ? [] : joined,
    wrongLetter: null,
    feedback:
      roundDone && roundIndex === rounds.length
        ? completionFeedback(correctIds.length, rounds.length)
        : SPEECH.correct(round, action.from),
    attempt,
    consecutiveWrong: 0,
    hintAttempt: null,
  };
}
