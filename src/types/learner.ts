import type { Learner } from "@/types/db";
import type { ActiveParticipantStatus, PracticalRatingStatus, PracticalResultValue } from "@/constants/enums";

export interface ActivityInfo {
  moduleName: string;
  activityName: string;
  week?: number;
  score?: number;
  activityScore?: number;
  /** Set instead of score/activityScore for a rated Practical Demonstration — never a numeric score. */
  practicalResult?: PracticalResultValue;
}

/**
 * One row of the teacher's Learners list. Identity fields are picked from the
 * service shape so a learner field is defined once; the rest is per-request
 * view state the page derives.
 */
/** Client-shaped view of the teacher's active classroom session, if any. */
export interface ActiveSession {
  id: number;
  status: "ACTIVE" | "INACTIVE";
  startedAt: Date;
  activeModule: {
    id: number;
    moduleName: string;
  } | null;
  activeActivityName: string | null;
  activeLessonTitle: string | null;
  activeActivityFormat: "digital" | "practical" | null;
  /** A practical activity on screen without a saved, reachable demo video: learners see it as Locked. */
  activeActivityNeedsVideo?: boolean;
}

export interface LearnerListItem
  extends Pick<Learner, "learnerId" | "lrn" | "firstName" | "middleName" | "lastName" | "gradeLevel" | "section" | "photoUrl" | "gender" | "birthdate"> {
  /** This school year's enrollment status; the class list hides "withdrawn" ones behind a toggle. */
  enrollmentStatus?: string | null;
  /** null when the learner hasn't started today's activity. */
  participantStatus: ActiveParticipantStatus | null;
  missingActivities: ActivityInfo[];
  completedActivities: ActivityInfo[];
  /** null unless a practical activity is the class's currently active activity. */
  activePracticalActivity: {
    activityId: number;
    activityName: string | null;
    ratingStatus: PracticalRatingStatus;
    remarks: string | null;
  } | null;
}
