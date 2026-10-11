import type { AttendanceStatus } from "@/constants/enums";
import type { LearnerListItem } from "@/types/learner";

/** Where a learner is on the class's current activity, in the order the teacher should look at them. */
export type LiveStatus = "rate" | "playing" | "not_started" | "finished" | "absent";

export const LIVE_STATUS_ORDER: LiveStatus[] = ["rate", "playing", "not_started", "finished", "absent"];

export const LIVE_STATUS_LABEL: Record<LiveStatus, string> = {
  rate: "Waiting for your rating",
  playing: "Playing",
  not_started: "Not started",
  finished: "Finished",
  absent: "Absent",
};

// One rule for the sort, the filter chips and the card, so they never disagree.
export function liveStatus(learner: LearnerListItem, attendance: AttendanceStatus | undefined): LiveStatus {
  if (attendance === "ABSENT") return "absent";
  const practical = learner.activePracticalActivity;
  // Only a learner who finished the current demonstration can be rated; it resets when the activity switches.
  if (practical && practical.ratingStatus === "NOT_RATED" && learner.participantStatus === "Finished") return "rate";
  if (learner.participantStatus === "Finished") return "finished";
  if (learner.participantStatus === "Started the Activity") return "playing";
  return "not_started";
}