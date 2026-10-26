/**
 * Domain enums, and the translation between the names the app uses and the
 * labels PostgreSQL actually stores.
 *
 * WHY THE TRANSLATION EXISTS:
 * One of the seven enum types in this database stores labels that differ from
 * the names the application code (and the UI) uses:
 *
 *   day_of_week  →  'Monday' … 'Friday'       app: MONDAY … FRIDAY
 *
 * The ORM used to hide that difference. Raw SQL does not: `WHERE day =
 * 'MONDAY'` matches zero rows and raises no error. So the services convert on
 * the way in (`dayToDb`) and on the way out (`dayFromDb`), and everything
 * above the service layer keeps working with the app-side names.
 *
 * `quarter` used to be a second translated enum ('1Quarter' … '4Quarter' →
 * Q1 … Q4), but `lessons.quarter` was dropped in favor of `lessons.quarter_id`
 * (FK to the `quarters` table) — see `quarter-service.ts`. Quarters are now
 * real rows with a `quarter_name` label, not an enum needing translation.
 *
 * The other five enums (gender, attendance_status, completion_status,
 * classroom_session_status, session_participant_status) store their labels
 * verbatim and need no translation — they're declared here only so call sites
 * have one place to import a type from. `guardian_relationship` used to be a
 * sixth; `guardian_info.relationship_to_learner` is now plain VARCHAR(50), so
 * that enum type no longer exists in the database.
 */

// ── DayOfWeek ───────────────────────────────────────────────────────────────

export const DayOfWeek = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
} as const;

export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

/** PostgreSQL `day_of_week` enum labels, keyed by app-side name. */
const DAY_DB_LABEL: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

const DAY_FROM_DB_LABEL: Record<string, DayOfWeek> = {
  Monday: DayOfWeek.MONDAY,
  Tuesday: DayOfWeek.TUESDAY,
  Wednesday: DayOfWeek.WEDNESDAY,
  Thursday: DayOfWeek.THURSDAY,
  Friday: DayOfWeek.FRIDAY,
};

/** App name → the label to send to PostgreSQL. */
export function dayToDb(day: DayOfWeek): string {
  return DAY_DB_LABEL[day];
}

/** PostgreSQL label → app name. Throws on an unrecognised label. */
export function dayFromDb(label: string): DayOfWeek {
  const day = DAY_FROM_DB_LABEL[label];
  if (!day) throw new Error(`Unknown day_of_week label from database: ${label}`);
  return day;
}

/** True when `name` (e.g. from currentWeekdayPH) is one of the school days. */
export function isSchoolDay(name: string): name is DayOfWeek {
  return name in DAY_DB_LABEL;
}

// ── Enums stored verbatim ───────────────────────────────────────────────────

export type Gender = "Male" | "Female";

export type ClassroomSessionStatus = "PENDING" | "ACTIVE" | "INACTIVE";

export type SessionParticipantStatus =
  | "Not Started"
  | "Started the Activity"
  | "Finished";

/** The two statuses listActiveParticipantStatuses can return — its SQL filters out "Not Started". */
export type ActiveParticipantStatus = Exclude<SessionParticipantStatus, "Not Started">;

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export type CompletionStatus = "PENDING" | "COMPLETED" | "MISSING";

/**
 * `digital_activity_scores.status` — lowercase, and distinct from
 * `CompletionStatus` (which backs the unrelated `completions` table's
 * lesson-completion tracking). Digital Activity finish only ever writes
 * `"completed"`; the other two members exist for the column's CHECK
 * constraint but aren't produced by any code path yet.
 */
export type DigitalActivityStatus = "not_started" | "in_progress" | "completed";

// ── Activity types ──────────────────────────────────────────────────────────

/**
 * `activities.activity_format` is the format-level gate: it decides which
 * scoring table and which finish/completion routes are valid for an
 * activity. `activities.activity_type` is a narrower, format-internal detail
 * (e.g. which grading strategy for a digital activity, or whether a
 * practical activity has a video) — a plain VARCHAR, not a PostgreSQL enum,
 * so it's a constant rather than a DAY_DB_LABEL-style translation table.
 */
export type ActivityFormat = "digital" | "practical";

/** Marks a practical activity as having an instructional video to show (see `demonstrations`). */
export const ACTIVITY_TYPE_DEMONSTRATION = "demonstration";

/** A result's band on the legends (lib/score-band.ts): 80%+ Very Good, 60–79% Good, below 60% Needs Help. */
export type ScoreBand = "needs_help" | "good" | "very_good";

export const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  needs_help: "Needs Help",
  good: "Good",
  very_good: "Very Good",
};

/** `learner_activity_attempts.practical_rating` — the teacher's 1 to 5 rating of a learner's practical activity. */
export type PracticalResultValue = 1 | 2 | 3 | 4 | 5;

export const PRACTICAL_RESULT_VALUES: PracticalResultValue[] = [1, 2, 3, 4, 5];

/** A rating counts as that many points out of this, in totals and percents. */
export const PRACTICAL_RESULT_MAX = 5;

/**
 * A practical activity's rating status as reported to callers. `NOT_RATED`
 * is derived — there is no `practical_activity_results` row for the learner
 * yet — never a value stored in the database.
 */
export type PracticalRatingStatus = PracticalResultValue | "NOT_RATED";

// ── Assessments (quarterly grading) ─────────────────────────────────────────

/**
 * `assessments.item_kind` — whether an assessment is ordinary daily content,
 * a review, or an exam. Doesn't feed the grade formula directly (mixed
 * exams contribute to their digital/practical components like anything
 * else); it documents intent and lets curriculum authors target "all EXAM
 * rows" when backfilling `is_graded`.
 */
export const ActivityItemKind = {
  REGULAR: "REGULAR",
  REVIEW: "REVIEW",
  EXAM: "EXAM",
} as const;

export type ActivityItemKind = (typeof ActivityItemKind)[keyof typeof ActivityItemKind];
