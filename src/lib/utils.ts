import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fisher-Yates shuffle. Returns a new array — never mutates the input, so it
 * is safe to call directly on the shared question arrays in constants/.
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Module name -> URL slug ("Writing Readiness" -> "writing-readiness").
 *
 * Shared by the module board, the lesson page's filter and the back link.
 * These three have to agree exactly — a slug that round-trips differently in
 * one of them silently lands the teacher on the wrong module — so the rule
 * lives here rather than being retyped at each call site.
 */
export function moduleSlug(moduleName: string): string {
  return moduleName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

/** On the edit controls of the active quarter: its lessons are in use by classes, so they're view-only. */
export const QUARTER_LOCKED_HINT =
  "This quarter is active and open for classes, so its lessons and practical activities are view-only."

/** On the edit controls of a completed quarter: it's over, so its lessons stay as they were taught. */
export const QUARTER_COMPLETED_HINT = "This quarter is completed, so its lessons and practical activities are view-only."

/** On the edit controls of a quarter the active school year hasn't set up (or with no active year): nothing to prepare yet. */
export const QUARTER_NOT_SET_HINT =
  "This quarter isn't set up in the active school year yet, so its lessons and practical activities can't be changed. Set its dates in Manage Quarters first."

/** On edit controls of content used in a class or by a learner: it stays as it was, whichever quarter is active. */
export const CONTENT_HAS_RECORDS_HINT = "This content has classroom or learner records and can no longer be changed."

/** Quarter name -> URL slug ("1st Quarter" -> "1st-quarter"). */
export function quarterSlug(quarterName: string): string {
  return quarterName.toLowerCase().replace(/\s+/g, "-")
}
