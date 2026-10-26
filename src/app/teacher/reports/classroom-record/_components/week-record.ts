import { PRACTICAL_RESULT_MAX, type PracticalResultValue, type ScoreBand } from "@/constants/enums";
import { hasMiddleName } from "@/lib/learners";

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

/** The score bands the screen, print and Excel legends all explain. */
export const LEGEND: [ScoreBand, string][] = [
  ["very_good", "80% and up"],
  ["good", "60–79%"],
  ["needs_help", "below 60%"],
];

/** "Dela Cruz, Juan Santos Jr." — the name the screen, print and exports all show. */
export function learnerName(row: ClassroomRecord["rows"][number]) {
  return `${row.lastName}, ${[row.firstName, hasMiddleName(row.middleName) && row.middleName, row.extensionName].filter(Boolean).join(" ")}`;
}

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
 * counts), rated practicals out of 5, unrated or missing results left out, null when nothing counts.
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
          // Same as ClassroomRecordController::points in the API: a rating is that many points out of 5.
          score += cell.rating;
          maxScore += PRACTICAL_RESULT_MAX;
        } else continue;
        counted = true;
      }
      return { ...row, total: counted ? { score, maxScore } : null };
    }),
  };
}
