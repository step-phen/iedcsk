import { z } from "zod";

/**
 * A teacher's rubric rating for one learner's practical-activity performance.
 *
 * `result` mirrors `learner_activity_attempts.practical_rating`'s CHECK constraint
 * (1 to 5) (see constants/enums.ts's `PracticalResultValue`) — anything else
 * is rejected here rather than reaching the database as an invalid write.
 */
export const practicalRatingSchema = z.object({
  learnerId: z.number().int().positive(),
  activityId: z.number().int().positive(),
  result: z.number().int().min(1).max(5),
  remarks: z.string().max(500).trim().optional(),
});

export type PracticalRating = z.infer<typeof practicalRatingSchema>;
