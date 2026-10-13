import { serverApi } from "@/lib/server-api";
import type { SchoolYear, Section } from "@/types/db";
import ProgressReportEditor, { type Report, type Roster } from "./progress-report-editor";

async function get<T>(path: string): Promise<T | null> {
  return serverApi(path)
    .then(async (res) => (res.ok ? ((await res.json()) as T) : null))
    .catch(() => null);
}

/** Active school year only. ?section=, ?learner= and ?quarter= pick the report; stale or foreign ids fall back like the Class Scores tab. */
export default async function ProgressReportSection({
  section,
  learner,
  quarter,
}: {
  section?: string;
  learner?: string;
  quarter?: string;
}) {
  const activeYear = ((await get<SchoolYear[]>("/api/school-years")) ?? []).find((y) => y.status === "active") ?? null;
  const sections = activeYear ? ((await get<Section[]>("/api/sections")) ?? []) : [];
  const sectionId = (sections.find((s) => String(s.sectionId) === section) ?? sections[0])?.sectionId ?? null;
  const roster =
    sectionId === null
      ? null
      : await get<Roster>(`/api/sections/${sectionId}/progress-reports${quarter && /^[1-4]$/.test(quarter) ? `?quarter=${quarter}` : ""}`);
  const picked = roster?.learners.find((l) => String(l.learnerId) === learner) ?? null;
  const report = picked?.reportId ? await get<Report>(`/api/progress-reports/${picked.reportId}`) : null;

  return (
    <ProgressReportEditor
      yearName={activeYear?.name ?? null}
      sections={sections}
      sectionId={sectionId}
      roster={roster}
      learnerId={picked?.learnerId ?? null}
      report={report}
    />
  );
}
