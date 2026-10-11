import { z } from "zod";
import { gradeLevels } from "@/lib/learners";

export const sectionSchema = z.object({
    gradeLevel: z
        .enum(gradeLevels, { message: "Grade level is required." }),

    sectionName: z
        .string()
        .trim()
        .min(1, "Section name is required.")
        .max(50, "Section name is too long."),
});

export type SectionSchemaType = z.infer<typeof sectionSchema>;
