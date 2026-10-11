import { z } from "zod";

/**
 * A teacher's rubric rating for one learner's practical-activity performance.
 *
 * `result` mirrors `practical_activity_results.result`'s CHECK constraint
 * verbatim (see constants/enums.ts's `PracticalResultValue`) — anything else
 * is rejected here rather than reaching the database as an invalid write.
 */
export const practicalRatingSchema = z.object({
  learnerId: z.number().int().positive(),
  activityId: z.number().int().positive(),
  result: z.enum(["needs_help", "good", "very_good"]),
  remarks: z.string().max(500).trim().optional(),
});

export type PracticalRating = z.infer<typeof practicalRatingSchema>;
