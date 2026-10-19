import type {
  ActivityItemKind,
  AttendanceStatus,
  ClassroomSessionStatus,
  CompletionStatus,
  DayOfWeek,
  DigitalActivityStatus,
  Gender,
  PracticalResultValue,
  SessionParticipantStatus,
} from "@/constants/enums";

/**
 * Shapes returned by the service layer.
 *
 * These are NOT a schema — PostgreSQL owns the schema (managed in pgAdmin 4).
 * They only describe what each service hands back, in the camelCase the rest
 * of the app already reads. Services map snake_case columns onto these; SQL
 * row shapes stay private to the service that runs the query.
 *
 * Only the fields the app actually consumes are listed. If a page needs a
 * column that isn't here, add it to both the SELECT and the type.
 */

export interface Teacher {
  teacherId: number;
  username: string;
  teacherName: string | null;
  passwordHash: string;
}

export interface Guardian {
  guardianId: number;
  learnerId: number;
  guardianName: string;
  contactNumber: string;
  /**
   * A preset token (MOTHER, UNCLE, …) or the free text the teacher typed when
   * they picked OTHER. Stored verbatim; render it as-is.
   */
  relationshipToLearner: string;
  guardianEmail: string | null;
  occupation: string | null;
}

/** A row of the `provinces` reference table. province_name is UNIQUE. */
export interface Province {
  provinceId: number;
  provinceName: string;
}

/** The only sections a school year can have, picked when it is activated. */
export type SectionChoice = "Joy" | "Faith";

/** A row of the `sections` table — the Add Learner form's Section dropdown is
 *  populated from these, filtered by grade level. sectionName is the editable
 *  display name; session comes from the stored Joy (morning) / Faith (afternoon)
 *  identity, never from the name, and is null only for an older section without one. */
export interface Section {
  sectionId: number;
  gradeLevel: string;
  sectionName: string;
  session: "morning" | "afternoon" | null;
  /** False once the section has any learner or classroom records; renameReason then says why. */
  canRename: boolean;
  renameReason: string | null;
}

/** A row of the institution-wide `school_years` table. name is UNIQUE and
 *  stored as "2026-2027"; dates are "YYYY-MM-DD", both null on an upcoming
 *  year whose official dates aren't set yet. */
export interface SchoolYear {
  schoolYearId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: "upcoming" | "active" | "completed";
  /** Sections already set up for this year; empty until it is first activated. */
  sections: SectionChoice[];
  /** Name of the year's active quarter ("1st Quarter"); only sent by GET /api/school-years/active. */
  activeQuarter?: string | null;
  /** Number (1-4) of that quarter, the one open for classes; only sent by GET /api/school-years/active. */
  activeQuarterNumber?: number | null;
  /** Quarter number (1-4) => status, configured quarters only; only sent by GET /api/school-years/active. */
  quarterStatuses?: Partial<Record<number, Quarter["status"]>>;
  /** False once the year has started (a quarter was activated or anything recorded); only sent by GET /api/school-years/active. */
  canAddModules?: boolean;
}

/** A row of `quarters`: one of Quarter 1-4 of a school year. name is generated
 *  from the number ("1st Quarter"); dates are "YYYY-MM-DD". */
export interface Quarter {
  quarterId: number;
  schoolYearId: number;
  quarterNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "completed";
}

/**
 * A learner's address — `learner_addresses`, one row per learner
 * (learner_id is UNIQUE, FK ON DELETE CASCADE).
 *
 * Every field is nullable because the columns are: the app requires all of
 * them on input (StoreLearnerRequest in the API), but this type describes what the database can
 * actually hand back, including rows written outside the app.
 */
export interface LearnerAddress {
  addressId: number;
  learnerId: number;
  zipCode: string | null;
  cityMunicipality: string | null;
  barangay: string | null;
  houseStreet: string | null;
  /** FK into `provinces` — what the address actually stores. */
  provinceId: number | null;
  /**
   * `provinces.province_name` from the join, never a column of
   * learner_addresses. Display only: writes go through provinceId, so a
   * corrected spelling in `provinces` shows up here with no address touched.
   */
  province: string | null;
}

export interface Learner {
  learnerId: number;
  teacherId: number;
  /** Learner Reference Number — nullable and unique in PostgreSQL. */
  lrn: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  /** e.g. "Jr.", "III" — null when none was chosen. */
  extensionName: string | null;
  birthdate: Date;
  gender: Gender;
  /** NULL when the learner has no `learner_addresses` row — the join is a
   *  LEFT JOIN, so a missing row reads as absent rather than failing. */
  address: LearnerAddress | null;
  /** From the learner's latest `enrollments` row (LEFT JOIN LATERAL). Null
   *  only for a learner with no enrollment row yet (pre-migration or none
   *  written). */
  gradeLevel: string | null;
  section: string | null;
  schoolYear: string | null;
  /** Root-relative URL under public/uploads/learners (see photo-storage.ts).
   *  NULL when no photo has been uploaded. */
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearnerWithGuardians extends Learner {
  guardians: Guardian[];
}

export interface Module {
  moduleId: number;
  moduleName: string;
}

export interface Activity {
  activityId: number;
  lessonId: number;
  activityName: string;
  description: string | null;
  day: DayOfWeek;
  /** Non-null only for an activity that's part of a graded assessment (see `Assessment`). Omitted by services that don't need it. */
  assessmentId?: number | null;
}

/** A gradable unit — `assessments`. Groups one or more `activities` rows (e.g. a review's digital + practical parts) under one graded/practice flag and REGULAR/REVIEW/EXAM kind, shared so sibling rows can't disagree. */
export interface Assessment {
  assessmentId: number;
  lessonId: number;
  itemKind: ActivityItemKind;
  isGraded: boolean;
  title: string | null;
}

export interface Lesson {
  lessonId: number;
  moduleId: number;
  lessonName: string;
  quarterId: number;
  quarterName: string;
  week: number;
  /** Media key from the related public.lesson_videos row (LEFT JOIN — a
   *  lesson has at most one video), e.g. "/video/language/Q1-Week1-lesson.mp4" —
   *  not a servable URL on its own. Null when no lesson_videos row exists —
   *  the learner then skips straight to the activity (see app/learner/lesson/page.tsx). */
  videoUrl: string | null;
}

export interface LessonWithActivities extends Lesson {
  activities: Activity[];
}

export interface ClassroomSession {
  classroomSessionId: number;
  teacherId: number;
  sessionDate: Date;
  activeModuleId: number | null;
  activeLessonId: number | null;
  activeActivityId: number | null;
  status: ClassroomSessionStatus;
  startedAt: Date;
  endedAt: Date | null;
}

export interface SessionParticipant {
  sessionParticipantId: number;
  classroomSessionId: number;
  learnerId: number;
  status: SessionParticipantStatus;
  joinedAt: Date;
}

export interface Attendance {
  attendanceId: number;
  classroomSessionId: number;
  learnerId: number;
  status: AttendanceStatus;
}

/** A Digital Activity's graded result — `digital_activity_scores`. */
export interface DigitalActivityScore {
  digitalScoreId: number;
  learnerId: number;
  activityId: number;
  status: DigitalActivityStatus;
  score: number;
  total: number;
  completedAt: Date | null;
}

/** A teacher's rubric rating of a learner's practical-activity performance — `practical_activity_results`. */
export interface PracticalActivityResult {
  practicalResultId: number;
  learnerId: number;
  activityId: number;
  result: PracticalResultValue;
  remarks: string | null;
  evaluatedAt: Date | null;
}

export interface Completion {
  completionId: number;
  learnerId: number;
  lessonId: number;
  status: CompletionStatus;
  completedAt: Date | null;
}

export interface ActivityQuestion {
  questionId: number;
  activityId: number;
  questionKey: string;
  questionOrder: number;
  /** Per-activity shape — narrowed by the game component that consumes it. */
  questionData: unknown;
  correctAnswer: { answer: string };
}
