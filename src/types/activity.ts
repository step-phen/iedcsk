/**
 * Shared contract between learner-facing game components and the server.
 *
 * Games no longer report a score. They report the answers the child actually
 * gave, and the server grades them against its own key (see lib/grading.ts).
 * This keeps DigitalActivityScore.score/total a server-derived fact rather
 * than something the browser asserts.
 */

/** One answer, keyed by the question's stable id (never its array index). */
export type SubmittedAnswer = {
  questionId: string;
  response: string;
};

export interface GameComponentProps {
  activityId?: number | null;
  activityName?: string | null;
  onFinish?: (answers: SubmittedAnswer[]) => void;
  [key: string]: unknown;
}

/** questionId -> the response that counts as correct. */
export type AnswerKey = Record<string, string>;
