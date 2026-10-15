import type { PracticalResultValue } from "@/constants/enums";

export type Cell = { score: number; maxScore: number } | { rating: PracticalResultValue | null };

/** GET /api/sections/{id}/classroom-record */
export interface ClassroomRecord {
  modules: { id: number; name: string }[];
  moduleId: number | null;
  domains: { id: number; name: string }[];
  domainId: number | null;
  quarter: number;
  columns: { activityId: number; name: string; format: "digital" | "practical"; week: number; day: number; maxScore: number | null }[];
  rows: {
    learnerId: number;
    firstName: string;
    middleName: string | null;
    lastName: string;
    extensionName: string | null;
    cells: Record<number, Cell>;
    total: { score: number; maxScore: number } | null;
  }[];
}

/** Same points as ClassroomRecordController::PRACTICAL_POINTS in the API; a rated practical counts out of 3. */
export const PRACTICAL_POINTS: Record<PracticalResultValue, number> = { needs_help: 1, good: 2, very_good: 3 };

/**
 * Weeks 1 to the last week with activities (a gap week stays listed and says it has none), and the week to show:
 * the ?week= value when this quarter has it, else the first week with activities, else null (no activities at all).
 */
export function pickWeek(columns: ClassroomRecord["columns"], raw: string | undefined) {
  const withActivities = new Set(columns.map((c) => c.week));
  const weeks = Array.from({ length: withActivities.size ? Math.max(...withActivities) : 0 }, (_, i) => ({
    week: i + 1,
    hasActivities: withActivities.has(i + 1),
  }));
  const selectedWeek = weeks.some((w) => String(w.week) === raw)
    ? Number(raw)
    : withActivities.size
      ? Math.min(...withActivities)
      : null;
  return { weeks, selectedWeek };
}

/**
 * The record cut to one week's columns, each learner's total recounted from those cells the way the API
 * counts the quarter: points summed (not percents averaged), digital scores as they are (a zero still
 * counts), rated practicals on the 3-point scale, unrated or missing results left out, null when nothing counts.
 */
export function weekRecord(record: ClassroomRecord, week: number): ClassroomRecord {
  const columns = record.columns.filter((c) => c.week === week);
  return {
    ...record,
    columns,
    rows: record.rows.map((row) => {
      let score = 0;
      let maxScore = 0;
      let counted = false;
      for (const c of columns) {
        const cell = row.cells[c.activityId];
        if (!cell) continue;
        if ("score" in cell) {
          score += cell.score;
          maxScore += cell.maxScore;
        } else if (cell.rating) {
          score += PRACTICAL_POINTS[cell.rating];
          maxScore += 3;
        } else continue;
        counted = true;
      }
      return { ...row, total: counted ? { score, maxScore } : null };
    }),
  };
}
