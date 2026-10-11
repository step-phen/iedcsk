import { z } from "zod";

// The API (StoreLessonVideoRequest) owns every lesson rule; this repeats only the video check so a wrong file fails before a long upload.
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const VIDEO_TYPES = VIDEO_ACCEPT.split(",");
const MAX_VIDEO_MB = 200;

export const lessonVideoSchema = z
  .instanceof(File)
  // An empty type means the browser could not tell; the API checks the file's contents anyway.
  .refine((f) => !f.type || VIDEO_TYPES.includes(f.type), "The video must be an MP4, WebM or MOV file.")
  .refine((f) => f.size <= MAX_VIDEO_MB * 1024 * 1024, `The video must not be larger than ${MAX_VIDEO_MB} MB.`);

/** The first problem with a picked video, or null when it may be uploaded. */
export function videoError(file: File): string | null {
  const result = lessonVideoSchema.safeParse(file);
  return result.success ? null : result.error.issues[0].message;
}
