import { z } from "zod";

/**
 * One learner's mark, as submitted by the attendance modal.
 *
 * The three labels are the `attendance_status` enum in PostgreSQL verbatim
 * (see constants/enums.ts) — anything else is rejected here rather than
 * reaching the database as an invalid enum cast.
 */
export const attendanceEntrySchema = z.object({
  learnerId: z.number().int().positive(),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
});

/**
 * The whole submission. Capped so a malformed or hostile payload can't turn
 * one click into an unbounded write; a kindergarten roster is nowhere near
 * this size.
 */
export const attendanceSchema = z.object({
  entries: z.array(attendanceEntrySchema).min(1).max(200),
});

export type AttendanceEntry = z.infer<typeof attendanceEntrySchema>;
